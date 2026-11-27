/**
 * Integration tests for refreshTokenRepository (direct calls against the test DB).
 * Type: integration (real I/O — repository functions + test DB, no HTTP layer).
 * Covers: create stores a bcrypt hash (never the raw token) with userId/familyId/expiresAt;
 *   findByRawToken returns the matching record among several, returns only
 *   { id, userId, familyId, expiresAt } (no tokenHash), still finds an expired token
 *   (reuse detection), returns null for an unknown token; deleteById removes only that row;
 *   deleteByFamily removes the whole family and keeps the user's other family;
 *   deleteAllForUser removes every family of that user and leaves other users untouched;
 *   pruneExpired deletes only expired rows and returns the deleted count.
 * Not yet covered: none.
 * Possible expansions: deleteById on a missing id (Prisma P2025); duplicate tokenHash
 *   (unique constraint); findByRawToken performance with many rows (O(n) bcrypt scan).
 */
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { refreshTokenRepository } from "@/repositories/refreshTokenRepository.js";
import { testPrisma } from "@/tests/helpers/testPrismaClient.js";
import { testSeeds } from "@/tests/helpers/seeds.js";

const ONE_HOUR_MS = 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * ONE_HOUR_MS;

let userId: string;
let otherUserId: string;

/** A fresh expiry in the future — a still-valid refresh token. */
function futureExpiry(): Date {
  return new Date(Date.now() + SEVEN_DAYS_MS);
}

/** An expiry in the past — an expired refresh token. */
function pastExpiry(): Date {
  return new Date(Date.now() - ONE_HOUR_MS);
}

describe("refreshTokenRepository integration tests", () => {
  // Two users are shared infrastructure — created once. Explicit emails avoid the
  // seed's Date.now()-based default colliding when both are created in the same ms.
  beforeAll(async () => {
    const stamp = Date.now();
    const user = await testSeeds.createUser({ email: `rt-owner-${stamp}@example.com` });
    const other = await testSeeds.createUser({ email: `rt-other-${stamp}@example.com` });
    userId = user.id;
    otherUserId = other.id;
  });

  // Tokens are the subject under test — scoped to our two users so rows created by
  // other test files are never touched.
  afterEach(async () => {
    await testPrisma.refreshToken.deleteMany({
      where: { userId: { in: [userId, otherUserId] } },
    });
  });

  // RefreshToken has onDelete: Cascade, so removing the users clears any leftovers.
  afterAll(async () => {
    await testPrisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  });

  describe("create", () => {
    it("stores a bcrypt hash of the token — never the raw value", async () => {
      const rawToken = `raw-${randomUUID()}`;
      const familyId = randomUUID();
      const expiresAt = futureExpiry();

      await refreshTokenRepository.create(rawToken, userId, familyId, expiresAt);

      const rows = await testPrisma.refreshToken.findMany({ where: { userId } });
      expect(rows).toHaveLength(1);
      const [row] = rows;
      expect(row.familyId).toBe(familyId);
      expect(row.expiresAt.getTime()).toBe(expiresAt.getTime());
      expect(row.tokenHash).not.toBe(rawToken);
      expect(row.tokenHash).not.toContain(rawToken);
      expect(await bcrypt.compare(rawToken, row.tokenHash)).toBe(true);
    });
  });

  describe("findByRawToken", () => {
    it("returns the matching record among several, without the hash", async () => {
      const familyId = randomUUID();
      const expiresAt = futureExpiry();
      const targetToken = `raw-${randomUUID()}`;
      await refreshTokenRepository.create(`raw-${randomUUID()}`, userId, familyId, futureExpiry());
      await refreshTokenRepository.create(targetToken, userId, familyId, expiresAt);
      await refreshTokenRepository.create(`raw-${randomUUID()}`, otherUserId, randomUUID(), futureExpiry());

      const found = await refreshTokenRepository.findByRawToken(targetToken);

      expect(found).not.toBeNull();
      const stored = await testPrisma.refreshToken.findUniqueOrThrow({ where: { id: found!.id } });
      expect(await bcrypt.compare(targetToken, stored.tokenHash)).toBe(true);
      // JSDoc @returns shape: exactly these four fields — the hash never leaves the repository.
      expect(found).toEqual({ id: stored.id, userId, familyId, expiresAt });
      expect(found).not.toHaveProperty("tokenHash");
    });

    // JSDoc: expired tokens must also be findable — reuse detection depends on it.
    it("still finds an expired token", async () => {
      const rawToken = `raw-${randomUUID()}`;
      const expiresAt = pastExpiry();
      await refreshTokenRepository.create(rawToken, userId, randomUUID(), expiresAt);

      const found = await refreshTokenRepository.findByRawToken(rawToken);

      expect(found).not.toBeNull();
      expect(found!.expiresAt.getTime()).toBe(expiresAt.getTime());
    });

    it("returns null for an unknown token", async () => {
      await refreshTokenRepository.create(`raw-${randomUUID()}`, userId, randomUUID(), futureExpiry());

      expect(await refreshTokenRepository.findByRawToken(`unknown-${randomUUID()}`)).toBeNull();
    });
  });

  describe("deleteById", () => {
    it("removes only the targeted token", async () => {
      const familyId = randomUUID();
      const consumedToken = `raw-${randomUUID()}`;
      await refreshTokenRepository.create(consumedToken, userId, familyId, futureExpiry());
      await refreshTokenRepository.create(`raw-${randomUUID()}`, userId, familyId, futureExpiry());
      const consumed = await refreshTokenRepository.findByRawToken(consumedToken);

      await refreshTokenRepository.deleteById(consumed!.id);

      const remaining = await testPrisma.refreshToken.findMany({ where: { userId } });
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).not.toBe(consumed!.id);
    });
  });

  describe("deleteByFamily", () => {
    it("removes every token in the family and keeps the user's other family", async () => {
      const reusedFamily = randomUUID();
      const otherFamily = randomUUID();
      await refreshTokenRepository.create(`raw-${randomUUID()}`, userId, reusedFamily, futureExpiry());
      await refreshTokenRepository.create(`raw-${randomUUID()}`, userId, reusedFamily, pastExpiry());
      await refreshTokenRepository.create(`raw-${randomUUID()}`, userId, otherFamily, futureExpiry());

      await refreshTokenRepository.deleteByFamily(reusedFamily);

      const remaining = await testPrisma.refreshToken.findMany({ where: { userId } });
      expect(remaining).toHaveLength(1);
      expect(remaining[0].familyId).toBe(otherFamily);
    });
  });

  describe("deleteAllForUser", () => {
    it("removes every token of the user across families and leaves other users untouched", async () => {
      await refreshTokenRepository.create(`raw-${randomUUID()}`, userId, randomUUID(), futureExpiry());
      await refreshTokenRepository.create(`raw-${randomUUID()}`, userId, randomUUID(), futureExpiry());
      await refreshTokenRepository.create(`raw-${randomUUID()}`, otherUserId, randomUUID(), futureExpiry());

      await refreshTokenRepository.deleteAllForUser(userId);

      expect(await testPrisma.refreshToken.count({ where: { userId } })).toBe(0);
      expect(await testPrisma.refreshToken.count({ where: { userId: otherUserId } })).toBe(1);
    });
  });

  describe("pruneExpired", () => {
    it("deletes only expired tokens and returns the deleted count", async () => {
      await refreshTokenRepository.create(`raw-${randomUUID()}`, userId, randomUUID(), pastExpiry());
      await refreshTokenRepository.create(`raw-${randomUUID()}`, otherUserId, randomUUID(), pastExpiry());
      await refreshTokenRepository.create(`raw-${randomUUID()}`, userId, randomUUID(), futureExpiry());

      const deletedCount = await refreshTokenRepository.pruneExpired();

      // pruneExpired is table-wide and earlier files may leave expired rows behind, so assert
      // a lower bound (our 2 expired rows) and our own rows rather than an exact total.
      expect(deletedCount).toBeGreaterThanOrEqual(2);
      expect(await testPrisma.refreshToken.count({ where: { userId: otherUserId } })).toBe(0);
      const ownRemaining = await testPrisma.refreshToken.findMany({ where: { userId } });
      expect(ownRemaining).toHaveLength(1);
      expect(ownRemaining[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
