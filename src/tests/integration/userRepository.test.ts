/**
 * Integration tests for userRepository (direct calls against the test DB).
 * Type: integration (real I/O — repository functions + test DB, no HTTP layer).
 * Covers: create persists and returns the user, and with a tx joins that transaction (rolled
 *   back with it); findById / findByEmail return the user or null; findAll with a role filter
 *   returns only that role, without a filter returns every role; update returns the updated
 *   user and persists it, returns null for an unknown id, rethrows other Prisma errors
 *   (duplicate email); delete returns the deleted user and removes it, returns null for an
 *   unknown id, rethrows other Prisma errors (user still referenced by a reservation);
 *   count with a role filter counts only that role, without a filter counts every user.
 * Not yet covered: none.
 * Possible expansions: findAll/count with role customer (symmetric to owner); update with a
 *   tx-less partial password change; create rejecting a duplicate email (P2002).
 */
import { randomUUID } from "node:crypto";
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { userRepository } from "@/repositories/userRepository.js";
import { testPrisma } from "@/tests/helpers/testPrismaClient.js";
import { testSeeds } from "@/tests/helpers/seeds.js";
import { Role, type Prisma, type User } from "../../generated/prisma/index.js";

// Every user this file creates is tracked here so afterEach can remove exactly those rows.
const createdUserIds: string[] = [];
const createdRestaurantIds: string[] = [];

let emailStamp: number;
let emailCounter = 0;

/** A unique email per call — email is @unique and VarChar(50), so no UUIDs. */
function nextEmail(): string {
  emailCounter += 1;
  return `ur-${emailStamp}-${emailCounter}@example.com`;
}

/** Minimal valid create payload for the repository under test. */
function userInput(overrides: Partial<Prisma.UserCreateInput> = {}): Prisma.UserCreateInput {
  return {
    firstname: "Repo",
    lastname: "Tester",
    email: nextEmail(),
    password: "hashed-elsewhere",
    role: Role.customer,
    ...overrides,
  };
}

/** Seeds a user through the shared fixture and tracks it for cleanup. */
async function seedUser(overrides: Partial<Prisma.UserCreateInput> = {}): Promise<User> {
  const user = await testSeeds.createUser({ email: nextEmail(), ...overrides });
  createdUserIds.push(user.id);
  return user;
}

describe("userRepository integration tests", () => {
  beforeAll(() => {
    emailStamp = Date.now();
  });

  // Reservations first — Reservation.customer has no onDelete, so it blocks the user delete.
  afterEach(async () => {
    await testPrisma.reservation.deleteMany({ where: { customerId: { in: createdUserIds } } });
    await testPrisma.restaurant.deleteMany({ where: { id: { in: createdRestaurantIds } } });
    await testPrisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
    createdRestaurantIds.length = 0;
  });

  describe("create", () => {
    it("persists and returns the new user", async () => {
      const input = userInput({ role: Role.owner });

      const created = await userRepository.create(input);
      createdUserIds.push(created.id);

      expect(created).toMatchObject({
        firstname: input.firstname,
        lastname: input.lastname,
        email: input.email,
        role: Role.owner,
      });
      const stored = await testPrisma.user.findUnique({ where: { id: created.id } });
      expect(stored).toEqual(created);
    });

    // JSDoc: optional tx — the write must belong to that transaction, so a rollback undoes it.
    it("joins the passed transaction — rolled back with it", async () => {
      const input = userInput();
      const rollbackSignal = new Error("force rollback");
      let visibleInsideTx = false;

      const thrown = await testPrisma
        .$transaction(async (tx) => {
          await userRepository.create(input, tx);
          visibleInsideTx = (await tx.user.findUnique({ where: { email: input.email } })) !== null;
          throw rollbackSignal;
        })
        .catch((e: unknown) => e);

      expect(thrown).toBe(rollbackSignal);
      expect(visibleInsideTx).toBe(true);
      expect(await testPrisma.user.findUnique({ where: { email: input.email } })).toBeNull();
    });
  });

  describe("findById", () => {
    it("returns the user with that id", async () => {
      const user = await seedUser();

      expect(await userRepository.findById(user.id)).toEqual(user);
    });

    it("returns null for an unknown id", async () => {
      expect(await userRepository.findById(randomUUID())).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("returns the user with that email", async () => {
      const user = await seedUser();

      expect(await userRepository.findByEmail(user.email)).toEqual(user);
    });

    it("returns null for an unknown email", async () => {
      expect(await userRepository.findByEmail(nextEmail())).toBeNull();
    });
  });

  // findAll is table-wide — assert on our own rows by id, never on the total length.
  describe("findAll", () => {
    it("with a role filter returns only users of that role", async () => {
      const owner = await seedUser({ role: Role.owner });
      const customer = await seedUser({ role: Role.customer });

      const owners = await userRepository.findAll({ role: Role.owner });

      const ids = owners.map((u) => u.id);
      expect(ids).toContain(owner.id);
      expect(ids).not.toContain(customer.id);
      expect(owners.every((u) => u.role === Role.owner)).toBe(true);
    });

    it("without a filter returns users of every role", async () => {
      const owner = await seedUser({ role: Role.owner });
      const customer = await seedUser({ role: Role.customer });

      const ids = (await userRepository.findAll()).map((u) => u.id);

      expect(ids).toEqual(expect.arrayContaining([owner.id, customer.id]));
    });
  });

  describe("update", () => {
    it("returns the updated user and persists the change", async () => {
      const user = await seedUser();

      const updated = await userRepository.update(user.id, { firstname: "Renamed" });

      expect(updated).not.toBeNull();
      expect(updated!.firstname).toBe("Renamed");
      expect(updated!.email).toBe(user.email);
      const stored = await testPrisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(stored.firstname).toBe("Renamed");
    });

    it("returns null for an unknown id", async () => {
      expect(await userRepository.update(randomUUID(), { firstname: "Ghost" })).toBeNull();
    });

    // JSDoc @throws: only P2025 maps to null; any other DB error propagates.
    it("rethrows a non-not-found error (duplicate email) and leaves the row unchanged", async () => {
      const taken = await seedUser();
      const user = await seedUser();

      await expect(userRepository.update(user.id, { email: taken.email })).rejects.toThrow();

      const stored = await testPrisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(stored.email).toBe(user.email);
    });
  });

  describe("delete", () => {
    it("returns the deleted user and removes the row", async () => {
      const user = await seedUser();

      const deleted = await userRepository.delete(user.id);

      expect(deleted).toEqual(user);
      expect(await testPrisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    });

    it("returns null for an unknown id", async () => {
      expect(await userRepository.delete(randomUUID())).toBeNull();
    });

    // JSDoc @throws: only P2025 maps to null; a FK violation propagates.
    it("rethrows a non-not-found error (user still has a reservation) and keeps the row", async () => {
      const user = await seedUser();
      const restaurant = await testSeeds.createRestaurant();
      createdRestaurantIds.push(restaurant.id);
      await testSeeds.createReservation({ restaurantId: restaurant.id, customerId: user.id });

      await expect(userRepository.delete(user.id)).rejects.toThrow();

      expect(await testPrisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
    });
  });

  // count is table-wide and earlier files may leave users behind, so compare against a
  // testPrisma count of the same filter rather than a hardcoded total.
  describe("count", () => {
    it("with a role filter counts only users of that role", async () => {
      await seedUser({ role: Role.owner });
      await seedUser({ role: Role.customer });

      const [repoOwners, dbOwners, dbAll] = await Promise.all([
        userRepository.count({ role: Role.owner }),
        testPrisma.user.count({ where: { role: Role.owner } }),
        testPrisma.user.count(),
      ]);

      expect(repoOwners).toBe(dbOwners);
      expect(repoOwners).toBeGreaterThanOrEqual(1);
      // Our seeded customer guarantees the filtered count is below the total.
      expect(repoOwners).toBeLessThan(dbAll);
    });

    it("without a filter counts every user", async () => {
      await seedUser({ role: Role.owner });
      await seedUser({ role: Role.customer });

      const [repoAll, dbAll] = await Promise.all([userRepository.count(), testPrisma.user.count()]);

      expect(repoAll).toBe(dbAll);
      expect(repoAll).toBeGreaterThanOrEqual(2);
    });
  });
});
