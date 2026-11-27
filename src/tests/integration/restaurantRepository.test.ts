/**
 * Integration tests for restaurantRepository (direct calls against the test DB).
 * Type: integration (real I/O — repository functions + test DB, no HTTP layer).
 * Covers: findById (found, null, sees rows through a tx); findAll (returns owned + unowned);
 *   findAllLocalized / findByIdLocalized (el → the 1 matching row, en → 0 rows because English
 *   lives on the canonical column, no translation → [], unknown id → null); findUnowned (only
 *   ownerId null); findByOwnerId (found, null, tx); findByOwnerIdWithTranslations (ALL rows
 *   unfiltered, null, tx); update (persists scalars + leaves others unchanged, null on unknown
 *   id, rethrows an out-of-range capacity error, tx rollback, ignores an owner relation write carried
 *   in a wider object); upsertTranslation (creates when absent, updates in place when present — still
 *   one row, tx rollback); assignOwner (sets owner on an unowned restaurant → true, never overwrites
 *   an existing owner → false, false on unknown id, rethrows FK violation for a missing user, tx
 *   rollback).
 * Not yet covered: none.
 * Possible expansions: findAllLocalized/findByIdLocalized with a translation row whose
 *   description is null (per-column fallback lives in the DTO, not here); upsertTranslation
 *   for a missing restaurant (FK violation).
 */
import { randomUUID } from "node:crypto";
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { restaurantRepository } from "@/repositories/restaurantRepository.js";
import { testPrisma } from "@/tests/helpers/testPrismaClient.js";
import { testSeeds } from "@/tests/helpers/seeds.js";
import { inRolledBackTx } from "@/tests/helpers/testDb.js";
import { DEFAULT_LOCALE, type SupportedLocale } from "@/constants/index.js";
import { Role, type Prisma, type Restaurant, type User } from "../../generated/prisma/index.js";

const GREEK: SupportedLocale = "el";
// Not a supported locale — used only to prove findByOwnerIdWithTranslations applies no filter.
const EXTRA_LOCALE = "de";

const createdRestaurantIds: string[] = [];
const createdUserIds: string[] = [];

let emailStamp: number;
let emailCounter = 0;

/** A unique email per call — email is @unique and VarChar(50), so no UUIDs. */
function nextEmail(): string {
  emailCounter += 1;
  return `rr-${emailStamp}-${emailCounter}@example.com`;
}

/** Seeds an owner-role user and tracks it for cleanup. */
async function seedOwner(): Promise<User> {
  const user = await testSeeds.createUser({ email: nextEmail(), role: Role.owner });
  createdUserIds.push(user.id);
  return user;
}

/** Seeds a restaurant (optionally owned) and tracks it for cleanup. */
async function seedRestaurant(ownerId?: string): Promise<Restaurant> {
  const restaurant = await testSeeds.createRestaurant(
    ownerId ? { owner: { connect: { id: ownerId } } } : {}
  );
  createdRestaurantIds.push(restaurant.id);
  return restaurant;
}

/** Inserts a translation row directly — setup only, not through the repository under test. */
async function seedTranslation(restaurantId: string, locale: string, description: string): Promise<void> {
  await testPrisma.restaurantTranslation.create({ data: { restaurantId, locale, description } });
}

/** Creates a restaurant inside [tx] only — invisible to any other connection until commit. */
async function createInsideTx(tx: Prisma.TransactionClient, ownerId?: string): Promise<Restaurant> {
  return testSeeds.createRestaurant(ownerId ? { owner: { connect: { id: ownerId } } } : {}, tx);
}

describe("restaurantRepository integration tests", () => {
  beforeAll(() => {
    emailStamp = Date.now();
  });

  // Restaurants first (translations cascade with them; ownerId references users), then users.
  afterEach(async () => {
    await testPrisma.restaurant.deleteMany({ where: { id: { in: createdRestaurantIds } } });
    await testPrisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdRestaurantIds.length = 0;
    createdUserIds.length = 0;
  });

  describe("findById", () => {
    it("returns the restaurant with that id", async () => {
      const restaurant = await seedRestaurant();

      expect(await restaurantRepository.findById(restaurant.id)).toEqual(restaurant);
    });

    it("returns null for an unknown id", async () => {
      expect(await restaurantRepository.findById(randomUUID())).toBeNull();
    });

    it("reads through the passed transaction", async () => {
      const found = await inRolledBackTx(async (tx) => {
        const uncommitted = await createInsideTx(tx);
        return restaurantRepository.findById(uncommitted.id, tx);
      });

      expect(found).not.toBeNull();
    });
  });

  // Table-wide reads — assert on our own ids, never on the total length.
  describe("findAll", () => {
    it("returns owned and unowned restaurants", async () => {
      const owner = await seedOwner();
      const owned = await seedRestaurant(owner.id);
      const unowned = await seedRestaurant();

      const ids = (await restaurantRepository.findAll()).map((r) => r.id);

      expect(ids).toEqual(expect.arrayContaining([owned.id, unowned.id]));
    });
  });

  describe("findAllLocalized", () => {
    it("joins only the requested locale's row — 1 row when translated, [] when not", async () => {
      const translated = await seedRestaurant();
      const untranslated = await seedRestaurant();
      await seedTranslation(translated.id, GREEK, "Ελληνική περιγραφή");

      const all = await restaurantRepository.findAllLocalized(GREEK);

      const withRow = all.find((r) => r.id === translated.id);
      const withoutRow = all.find((r) => r.id === untranslated.id);
      expect(withRow?.translations).toHaveLength(1);
      expect(withRow?.translations[0]).toMatchObject({ locale: GREEK, description: "Ελληνική περιγραφή" });
      expect(withoutRow?.translations).toEqual([]);
    });

    // DOMAIN.md canonical-English fallback: English lives on Restaurant.description, never in
    // restaurant_translations — so the default locale joins no rows even when el exists.
    it("joins no rows for the default locale", async () => {
      const translated = await seedRestaurant();
      await seedTranslation(translated.id, GREEK, "Ελληνική περιγραφή");

      const all = await restaurantRepository.findAllLocalized(DEFAULT_LOCALE);

      expect(all.find((r) => r.id === translated.id)?.translations).toEqual([]);
    });
  });

  describe("findByIdLocalized", () => {
    it("returns the restaurant with its row for the requested locale", async () => {
      const restaurant = await seedRestaurant();
      await seedTranslation(restaurant.id, GREEK, "Ελληνική περιγραφή");

      const found = await restaurantRepository.findByIdLocalized(restaurant.id, GREEK);

      expect(found).toMatchObject({ id: restaurant.id, description: restaurant.description });
      expect(found?.translations).toHaveLength(1);
      expect(found?.translations[0].locale).toBe(GREEK);
    });

    // DOMAIN.md canonical-English fallback — see findAllLocalized.
    it("joins no rows for the default locale even when another locale exists", async () => {
      const restaurant = await seedRestaurant();
      await seedTranslation(restaurant.id, GREEK, "Ελληνική περιγραφή");

      const found = await restaurantRepository.findByIdLocalized(restaurant.id, DEFAULT_LOCALE);

      expect(found).not.toBeNull();
      expect(found?.translations).toEqual([]);
    });

    it("returns null for an unknown id", async () => {
      expect(await restaurantRepository.findByIdLocalized(randomUUID(), GREEK)).toBeNull();
    });
  });

  // DOMAIN.md: an unowned restaurant is one with ownerId = null.
  describe("findUnowned", () => {
    it("returns only restaurants without an owner", async () => {
      const owner = await seedOwner();
      const owned = await seedRestaurant(owner.id);
      const unowned = await seedRestaurant();

      const result = await restaurantRepository.findUnowned();

      const ids = result.map((r) => r.id);
      expect(ids).toContain(unowned.id);
      expect(ids).not.toContain(owned.id);
      expect(result.every((r) => r.ownerId === null)).toBe(true);
    });
  });

  describe("findByOwnerId", () => {
    it("returns the restaurant owned by that user", async () => {
      const owner = await seedOwner();
      const owned = await seedRestaurant(owner.id);

      expect(await restaurantRepository.findByOwnerId(owner.id)).toEqual(owned);
    });

    it("returns null for a user who owns no restaurant", async () => {
      const owner = await seedOwner();

      expect(await restaurantRepository.findByOwnerId(owner.id)).toBeNull();
    });

    it("reads through the passed transaction", async () => {
      const owner = await seedOwner();

      const found = await inRolledBackTx(async (tx) => {
        await createInsideTx(tx, owner.id);
        return restaurantRepository.findByOwnerId(owner.id, tx);
      });

      expect(found).not.toBeNull();
    });
  });

  describe("findByOwnerIdWithTranslations", () => {
    // JSDoc: joined with ALL its translation rows — no locale filter.
    it("returns the owner's restaurant with every translation row", async () => {
      const owner = await seedOwner();
      const owned = await seedRestaurant(owner.id);
      await seedTranslation(owned.id, GREEK, "Ελληνική περιγραφή");
      await seedTranslation(owned.id, EXTRA_LOCALE, "Deutsche Beschreibung");

      const found = await restaurantRepository.findByOwnerIdWithTranslations(owner.id);

      expect(found?.id).toBe(owned.id);
      expect(found?.translations.map((t) => t.locale).sort()).toEqual([EXTRA_LOCALE, GREEK].sort());
    });

    it("returns null for a user who owns no restaurant", async () => {
      const owner = await seedOwner();

      expect(await restaurantRepository.findByOwnerIdWithTranslations(owner.id)).toBeNull();
    });

    it("reads through the passed transaction", async () => {
      const owner = await seedOwner();

      const found = await inRolledBackTx(async (tx) => {
        await createInsideTx(tx, owner.id);
        return restaurantRepository.findByOwnerIdWithTranslations(owner.id, tx);
      });

      expect(found).not.toBeNull();
    });
  });

  describe("update", () => {
    it("persists the given scalars and leaves the other columns unchanged", async () => {
      const restaurant = await seedRestaurant();

      const updated = await restaurantRepository.update(restaurant.id, { name: "Renamed Place", capacity: 12 });

      expect(updated).toMatchObject({ name: "Renamed Place", capacity: 12, address: restaurant.address });
      const stored = await testPrisma.restaurant.findUniqueOrThrow({ where: { id: restaurant.id } });
      expect(stored).toEqual({ ...restaurant, name: "Renamed Place", capacity: 12 });
    });

    // JSDoc: maps P2025 (record not found) to null.
    it("returns null for an unknown id", async () => {
      expect(await restaurantRepository.update(randomUUID(), { name: "Ghost Place" })).toBeNull();
    });

    // JSDoc @throws: only P2025 maps to null; any other DB error propagates.
    // Trigger: capacity is a Postgres Int (32-bit), so 2^31 is out of range.
    it("rethrows a non-not-found error (capacity out of Int range) and leaves the row unchanged", async () => {
      const restaurant = await seedRestaurant();

      await expect(restaurantRepository.update(restaurant.id, { capacity: 2 ** 31 })).rejects.toThrow();

      const stored = await testPrisma.restaurant.findUniqueOrThrow({ where: { id: restaurant.id } });
      expect(stored.capacity).toBe(restaurant.capacity);
    });

    it("writes through the passed transaction — rolled back with it", async () => {
      const restaurant = await seedRestaurant();

      const updatedInTx = await inRolledBackTx((tx) =>
        restaurantRepository.update(restaurant.id, { name: "Rolled Back" }, tx)
      );

      expect(updatedInTx?.name).toBe("Rolled Back");
      const stored = await testPrisma.restaurant.findUniqueOrThrow({ where: { id: restaurant.id } });
      expect(stored.name).toBe(restaurant.name);
    });

    // DOMAIN.md: a restaurant's owner is permanent once assigned. A wide Prisma input still compiles
    // against the narrow parameter type (all-optional types accept extra keys from variables), so the
    // repository must drop the relation write at runtime.
    it("ignores an ownership change carried in a wider object and still applies the editable fields", async () => {
      const originalOwner = await seedOwner();
      const otherUser = await seedOwner();
      const restaurant = await seedRestaurant(originalOwner.id);
      const widerInput: Prisma.RestaurantUpdateInput = {
        name: "Renamed Place",
        owner: { connect: { id: otherUser.id } },
      };

      await restaurantRepository.update(restaurant.id, widerInput);

      const stored = await testPrisma.restaurant.findUniqueOrThrow({ where: { id: restaurant.id } });
      expect(stored.ownerId).toBe(originalOwner.id);
      expect(stored.name).toBe("Renamed Place");
    });
  });

  describe("upsertTranslation", () => {
    it("creates the row when the (restaurant, locale) pair has none", async () => {
      const restaurant = await seedRestaurant();

      const row = await restaurantRepository.upsertTranslation(restaurant.id, GREEK, "Νέα περιγραφή");

      expect(row).toMatchObject({ restaurantId: restaurant.id, locale: GREEK, description: "Νέα περιγραφή" });
      expect(await testPrisma.restaurantTranslation.count({ where: { restaurantId: restaurant.id } })).toBe(1);
    });

    // JSDoc: one row per (restaurant, locale) — an upsert updates in place, never duplicates.
    it("updates the existing row in place when the pair already exists", async () => {
      const restaurant = await seedRestaurant();
      await seedTranslation(restaurant.id, GREEK, "Παλιά περιγραφή");

      await restaurantRepository.upsertTranslation(restaurant.id, GREEK, "Νέα περιγραφή");

      const rows = await testPrisma.restaurantTranslation.findMany({ where: { restaurantId: restaurant.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0].description).toBe("Νέα περιγραφή");
    });

    it("writes through the passed transaction — rolled back with it", async () => {
      const restaurant = await seedRestaurant();

      await inRolledBackTx((tx) =>
        restaurantRepository.upsertTranslation(restaurant.id, GREEK, "Rolled back", tx)
      );

      expect(await testPrisma.restaurantTranslation.count({ where: { restaurantId: restaurant.id } })).toBe(0);
    });
  });

  describe("assignOwner", () => {
    it("sets the owner of an unowned restaurant and returns true", async () => {
      const owner = await seedOwner();
      const restaurant = await seedRestaurant();

      expect(await restaurantRepository.assignOwner(restaurant.id, owner.id)).toBe(true);

      const stored = await testPrisma.restaurant.findUniqueOrThrow({ where: { id: restaurant.id } });
      expect(stored.ownerId).toBe(owner.id);
    });

    // DOMAIN.md: a restaurant's owner is permanent once assigned.
    it("does not overwrite an existing owner and returns false", async () => {
      const originalOwner = await seedOwner();
      const otherUser = await seedOwner();
      const restaurant = await seedRestaurant(originalOwner.id);

      expect(await restaurantRepository.assignOwner(restaurant.id, otherUser.id)).toBe(false);

      const stored = await testPrisma.restaurant.findUniqueOrThrow({ where: { id: restaurant.id } });
      expect(stored.ownerId).toBe(originalOwner.id);
    });

    it("returns false for an unknown restaurant id", async () => {
      const owner = await seedOwner();

      expect(await restaurantRepository.assignOwner(randomUUID(), owner.id)).toBe(false);
    });

    // JSDoc @throws: DB errors propagate — a FK violation for a missing user is not mapped to false.
    it("rethrows a DB error (owner user does not exist)", async () => {
      const restaurant = await seedRestaurant();

      await expect(restaurantRepository.assignOwner(restaurant.id, randomUUID())).rejects.toThrow();

      const stored = await testPrisma.restaurant.findUniqueOrThrow({ where: { id: restaurant.id } });
      expect(stored.ownerId).toBeNull();
    });

    it("writes through the passed transaction — rolled back with it", async () => {
      const owner = await seedOwner();
      const restaurant = await seedRestaurant();

      const assignedInTx = await inRolledBackTx((tx) =>
        restaurantRepository.assignOwner(restaurant.id, owner.id, tx)
      );

      expect(assignedInTx).toBe(true);
      const stored = await testPrisma.restaurant.findUniqueOrThrow({ where: { id: restaurant.id } });
      expect(stored.ownerId).toBeNull();
    });
  });
});
