/**
 * Integration tests for reservationRepository (direct calls against the test DB).
 * Type: integration (real I/O — repository functions + test DB, no HTTP layer).
 * Covers: create (persists with status active by default, tx rollback); findById (found, null,
 *   tx read); findAll (restaurantId / customerId / status filters, no filter, scheduledAt desc
 *   order, joined restaurant + customer projection without password/role); update (persists,
 *   null on unknown id, rethrows out-of-range people, tx rollback); delete (removes, null on
 *   unknown id, rethrows malformed id, tx rollback); count (restaurantId, customerId, status);
 *   countActiveBySlot (active rows at the exact slot regardless of people, ignores non-active
 *   statuses / other times / other restaurants, tx read, holds FOR UPDATE row locks inside a
 *   tx); findActiveByCustomerInWindow (conflict just inside ±4h, none just outside, exact ±4h
 *   boundary, any restaurant, ignores non-active and other customers, excludeId, tx read).
 * Not yet covered: none.
 * Possible expansions: combined findAll filters; countActiveBySlot without tx takes no lock.
 */
import { randomUUID } from "node:crypto";
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { reservationRepository } from "@/repositories/reservationRepository.js";
import { testPrisma } from "@/tests/helpers/testPrismaClient.js";
import { testSeeds } from "@/tests/helpers/seeds.js";
import { inRolledBackTx } from "@/tests/helpers/testDb.js";
import { RESERVATION_STATUS } from "@/constants/index.js";
import type { Prisma, Reservation, Restaurant, User } from "../../generated/prisma/index.js";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
// DOMAIN.md per-customer conflict buffer: 4 hours. Written out here (not imported from the
// source's constant) so the test checks the rule, not whatever the constant currently says.
const BUFFER_MS = 4 * HOUR_MS;
// A fixed future slot on a whole minute — DateTime is timestamp(3), so no sub-ms drift.
const SLOT = new Date(Date.UTC(2030, 0, 15, 19, 0, 0));

const createdRestaurantIds: string[] = [];
const createdUserIds: string[] = [];

let emailStamp: number;
let emailCounter = 0;

/** A unique email per call — email is @unique and VarChar(50), so no UUIDs. */
function nextEmail(): string {
  emailCounter += 1;
  return `rv-${emailStamp}-${emailCounter}@example.com`;
}

/** Shifts [base] by [ms] milliseconds. */
function at(base: Date, ms: number): Date {
  return new Date(base.getTime() + ms);
}

async function seedCustomer(): Promise<User> {
  const user = await testSeeds.createUser({ email: nextEmail() });
  createdUserIds.push(user.id);
  return user;
}

async function seedRestaurant(): Promise<Restaurant> {
  const restaurant = await testSeeds.createRestaurant();
  createdRestaurantIds.push(restaurant.id);
  return restaurant;
}

/** Seeds a reservation; the afterEach sweep removes it via its restaurant id. */
async function seedReservation(data: {
  restaurantId: string;
  customerId: string;
  scheduledAt?: Date;
  people?: number;
  status?: "active" | "canceled" | "completed" | "no_show";
}): Promise<Reservation> {
  return testSeeds.createReservation({ scheduledAt: SLOT, ...data });
}

/** Tries to lock one reservation row from a separate connection without waiting. */
async function tryLockFromOtherConnection(id: string): Promise<unknown> {
  return testPrisma.$queryRaw`SELECT id FROM "Reservations" WHERE id = ${id}::uuid FOR UPDATE NOWAIT`.catch(
    (e: unknown) => e
  );
}

describe("reservationRepository integration tests", () => {
  let restaurant: Restaurant;
  let customer: User;

  beforeAll(() => {
    emailStamp = Date.now();
  });

  // Fresh restaurant + customer per test, so no reservation leaks between window/slot cases.
  beforeEach(async () => {
    restaurant = await seedRestaurant();
    customer = await seedCustomer();
  });

  // Reservations first (they reference restaurants and users without onDelete), then parents.
  afterEach(async () => {
    await testPrisma.reservation.deleteMany({
      where: {
        OR: [{ restaurantId: { in: createdRestaurantIds } }, { customerId: { in: createdUserIds } }],
      },
    });
    await testPrisma.restaurant.deleteMany({ where: { id: { in: createdRestaurantIds } } });
    await testPrisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdRestaurantIds.length = 0;
    createdUserIds.length = 0;
  });

  /** Minimal valid create payload for the repository under test. */
  function reservationInput(scheduledAt: Date = SLOT): Prisma.ReservationCreateInput {
    return {
      scheduledAt,
      people: 4,
      restaurant: { connect: { id: restaurant.id } },
      customer: { connect: { id: customer.id } },
    };
  }

  describe("create", () => {
    // DOMAIN.md status table: active is set by the system on create.
    it("persists the reservation with status active by default", async () => {
      const created = await reservationRepository.create(reservationInput());

      expect(created).toMatchObject({
        scheduledAt: SLOT,
        people: 4,
        restaurantId: restaurant.id,
        customerId: customer.id,
        status: RESERVATION_STATUS.ACTIVE,
      });
      expect(await testPrisma.reservation.findUnique({ where: { id: created.id } })).toEqual(created);
    });

    it("writes through the passed transaction — rolled back with it", async () => {
      const createdInTx = await inRolledBackTx((tx) => reservationRepository.create(reservationInput(), tx));

      expect(await testPrisma.reservation.findUnique({ where: { id: createdInTx.id } })).toBeNull();
    });
  });

  describe("findById", () => {
    it("returns the reservation with that id", async () => {
      const reservation = await seedReservation({ restaurantId: restaurant.id, customerId: customer.id });

      expect(await reservationRepository.findById(reservation.id)).toEqual(reservation);
    });

    it("returns null for an unknown id", async () => {
      expect(await reservationRepository.findById(randomUUID())).toBeNull();
    });

    it("reads through the passed transaction", async () => {
      const found = await inRolledBackTx(async (tx) => {
        const uncommitted = await tx.reservation.create({ data: reservationInput() });
        return reservationRepository.findById(uncommitted.id, tx);
      });

      expect(found).not.toBeNull();
    });
  });

  // Table-wide unless filtered — assert on our own ids.
  describe("findAll", () => {
    it("filters by restaurantId", async () => {
      const otherRestaurant = await seedRestaurant();
      const here = await seedReservation({ restaurantId: restaurant.id, customerId: customer.id });
      const elsewhere = await seedReservation({
        restaurantId: otherRestaurant.id,
        customerId: customer.id,
        scheduledAt: at(SLOT, 6 * HOUR_MS),
      });

      const ids = (await reservationRepository.findAll({ restaurantId: restaurant.id })).map((r) => r.id);

      expect(ids).toEqual([here.id]);
      expect(ids).not.toContain(elsewhere.id);
    });

    it("filters by customerId", async () => {
      const otherCustomer = await seedCustomer();
      const mine = await seedReservation({ restaurantId: restaurant.id, customerId: customer.id });
      await seedReservation({ restaurantId: restaurant.id, customerId: otherCustomer.id });

      const ids = (await reservationRepository.findAll({ customerId: customer.id })).map((r) => r.id);

      expect(ids).toEqual([mine.id]);
    });

    it("filters by status", async () => {
      const active = await seedReservation({ restaurantId: restaurant.id, customerId: customer.id });
      const canceled = await seedReservation({
        restaurantId: restaurant.id,
        customerId: customer.id,
        scheduledAt: at(SLOT, 6 * HOUR_MS),
        status: "canceled",
      });

      const result = await reservationRepository.findAll({ status: RESERVATION_STATUS.CANCELED });

      const ids = result.map((r) => r.id);
      expect(ids).toContain(canceled.id);
      expect(ids).not.toContain(active.id);
      expect(result.every((r) => r.status === RESERVATION_STATUS.CANCELED)).toBe(true);
    });

    it("without a filter returns reservations of every restaurant and customer", async () => {
      const otherRestaurant = await seedRestaurant();
      const otherCustomer = await seedCustomer();
      const first = await seedReservation({ restaurantId: restaurant.id, customerId: customer.id });
      const second = await seedReservation({ restaurantId: otherRestaurant.id, customerId: otherCustomer.id });

      const ids = (await reservationRepository.findAll()).map((r) => r.id);

      expect(ids).toEqual(expect.arrayContaining([first.id, second.id]));
    });

    // JSDoc: ordered by scheduledAt descending.
    it("orders results by scheduledAt, latest first", async () => {
      const middle = await seedReservation({ restaurantId: restaurant.id, customerId: customer.id, scheduledAt: SLOT });
      const earliest = await seedReservation({
        restaurantId: restaurant.id,
        customerId: customer.id,
        scheduledAt: at(SLOT, -24 * HOUR_MS),
      });
      const latest = await seedReservation({
        restaurantId: restaurant.id,
        customerId: customer.id,
        scheduledAt: at(SLOT, 24 * HOUR_MS),
      });

      const ids = (await reservationRepository.findAll({ customerId: customer.id })).map((r) => r.id);

      expect(ids).toEqual([latest.id, middle.id, earliest.id]);
    });

    // DOMAIN.md: the customer projection is id, firstname, lastname, email — no role, no password.
    it("joins the restaurant and customer projections without sensitive fields", async () => {
      await seedReservation({ restaurantId: restaurant.id, customerId: customer.id });

      const [found] = await reservationRepository.findAll({ customerId: customer.id });

      expect(found.restaurant).toEqual({
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone,
      });
      expect(found.customer).toEqual({
        id: customer.id,
        firstname: customer.firstname,
        lastname: customer.lastname,
        email: customer.email,
      });
    });
  });

  describe("update", () => {
    it("returns the updated reservation and persists the change", async () => {
      const reservation = await seedReservation({ restaurantId: restaurant.id, customerId: customer.id });

      const updated = await reservationRepository.update(reservation.id, { people: 6 });

      expect(updated?.people).toBe(6);
      const stored = await testPrisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
      expect(stored).toEqual({ ...reservation, people: 6 });
    });

    it("returns null for an unknown id", async () => {
      expect(await reservationRepository.update(randomUUID(), { people: 2 })).toBeNull();
    });

    // JSDoc @throws: only P2025 maps to null; any other DB error propagates.
    // Trigger: people is a Postgres Int (32-bit), so 2^31 is out of range.
    it("rethrows a non-not-found error (people out of Int range) and leaves the row unchanged", async () => {
      const reservation = await seedReservation({ restaurantId: restaurant.id, customerId: customer.id });

      await expect(reservationRepository.update(reservation.id, { people: 2 ** 31 })).rejects.toThrow();

      const stored = await testPrisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
      expect(stored.people).toBe(reservation.people);
    });

    // JSDoc: tx must be forwarded so the write is part of the same atomic operation.
    it("writes through the passed transaction — rolled back with it", async () => {
      const reservation = await seedReservation({ restaurantId: restaurant.id, customerId: customer.id });

      const updatedInTx = await inRolledBackTx((tx) =>
        reservationRepository.update(reservation.id, { status: RESERVATION_STATUS.CANCELED }, tx)
      );

      expect(updatedInTx?.status).toBe(RESERVATION_STATUS.CANCELED);
      const stored = await testPrisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
      expect(stored.status).toBe(RESERVATION_STATUS.ACTIVE);
    });
  });

  describe("delete", () => {
    it("returns the deleted reservation and removes the row", async () => {
      const reservation = await seedReservation({ restaurantId: restaurant.id, customerId: customer.id });

      expect(await reservationRepository.delete(reservation.id)).toEqual(reservation);
      expect(await testPrisma.reservation.findUnique({ where: { id: reservation.id } })).toBeNull();
    });

    it("returns null for an unknown id", async () => {
      expect(await reservationRepository.delete(randomUUID())).toBeNull();
    });

    // JSDoc @throws: only P2025 maps to null; a malformed id errors differently and propagates.
    it("rethrows a non-not-found error (malformed id)", async () => {
      await expect(reservationRepository.delete("not-a-uuid")).rejects.toThrow();
    });

    it("writes through the passed transaction — rolled back with it", async () => {
      const reservation = await seedReservation({ restaurantId: restaurant.id, customerId: customer.id });

      await inRolledBackTx((tx) => reservationRepository.delete(reservation.id, tx));

      expect(await testPrisma.reservation.findUnique({ where: { id: reservation.id } })).not.toBeNull();
    });
  });

  describe("count", () => {
    it("counts only the given restaurant's reservations", async () => {
      const otherRestaurant = await seedRestaurant();
      await seedReservation({ restaurantId: restaurant.id, customerId: customer.id });
      await seedReservation({ restaurantId: restaurant.id, customerId: customer.id, scheduledAt: at(SLOT, 6 * HOUR_MS) });
      await seedReservation({ restaurantId: otherRestaurant.id, customerId: customer.id });

      expect(await reservationRepository.count({ restaurantId: restaurant.id })).toBe(2);
    });

    it("counts only the given customer's reservations", async () => {
      const otherCustomer = await seedCustomer();
      await seedReservation({ restaurantId: restaurant.id, customerId: customer.id });
      await seedReservation({ restaurantId: restaurant.id, customerId: otherCustomer.id });

      expect(await reservationRepository.count({ customerId: customer.id })).toBe(1);
    });

    // JSDoc: optional filter includes status.
    it("counts only reservations with the given status", async () => {
      await seedReservation({ restaurantId: restaurant.id, customerId: customer.id });
      await seedReservation({
        restaurantId: restaurant.id,
        customerId: customer.id,
        scheduledAt: at(SLOT, 6 * HOUR_MS),
        status: "canceled",
      });

      expect(
        await reservationRepository.count({ restaurantId: restaurant.id, status: RESERVATION_STATUS.CANCELED })
      ).toBe(1);
    });
  });

  describe("countActiveBySlot", () => {
    // DOMAIN.md capacity: one reservation = one slot regardless of people.
    it("counts each active reservation at the exact slot once, whatever its party size", async () => {
      const secondCustomer = await seedCustomer();
      await seedReservation({ restaurantId: restaurant.id, customerId: customer.id, people: 8 });
      await seedReservation({ restaurantId: restaurant.id, customerId: secondCustomer.id, people: 1 });

      expect(await reservationRepository.countActiveBySlot(restaurant.id, SLOT)).toBe(2);
    });

    // DOMAIN.md capacity counts *active* reservations only.
    it("ignores canceled, completed and no-show reservations", async () => {
      for (const status of ["canceled", "completed", "no_show"] as const) {
        const someone = await seedCustomer();
        await seedReservation({ restaurantId: restaurant.id, customerId: someone.id, status });
      }

      expect(await reservationRepository.countActiveBySlot(restaurant.id, SLOT)).toBe(0);
    });

    // JSDoc: a specific restaurant and time slot.
    it("ignores other time slots and other restaurants", async () => {
      const otherRestaurant = await seedRestaurant();
      const otherCustomer = await seedCustomer();
      await seedReservation({ restaurantId: restaurant.id, customerId: customer.id, scheduledAt: at(SLOT, 30 * MINUTE_MS) });
      await seedReservation({ restaurantId: otherRestaurant.id, customerId: otherCustomer.id });

      expect(await reservationRepository.countActiveBySlot(restaurant.id, SLOT)).toBe(0);
    });

    it("reads through the passed transaction", async () => {
      const countInTx = await inRolledBackTx(async (tx) => {
        await tx.reservation.create({ data: reservationInput() });
        return reservationRepository.countActiveBySlot(restaurant.id, SLOT, tx);
      });

      expect(countInTx).toBe(1);
    });

    // DOMAIN.md / JSDoc: inside the booking transaction the counted rows are locked FOR UPDATE,
    // so a concurrent booking cannot read-then-write the same slot (overbooking guard).
    it("locks the counted rows inside a transaction", async () => {
      const reservation = await seedReservation({ restaurantId: restaurant.id, customerId: customer.id });

      const lockAttemptWhileHeld = await inRolledBackTx(async (tx) => {
        await reservationRepository.countActiveBySlot(restaurant.id, SLOT, tx);
        return tryLockFromOtherConnection(reservation.id);
      });

      expect(lockAttemptWhileHeld).toBeInstanceOf(Error);
      // Control: once the tx is gone the same query succeeds — proves the query itself is valid.
      expect(await tryLockFromOtherConnection(reservation.id)).toEqual([{ id: reservation.id }]);
    });
  });

  describe("findActiveByCustomerInWindow", () => {
    // DOMAIN.md: a customer cannot have two active reservations within 4 hours of each other.
    it("finds an active reservation just inside the window, after or before", async () => {
      const existing = await seedReservation({ restaurantId: restaurant.id, customerId: customer.id });

      const after = await reservationRepository.findActiveByCustomerInWindow(customer.id, at(SLOT, BUFFER_MS - MINUTE_MS));
      const before = await reservationRepository.findActiveByCustomerInWindow(customer.id, at(SLOT, -(BUFFER_MS - MINUTE_MS)));

      expect(after?.id).toBe(existing.id);
      expect(before?.id).toBe(existing.id);
    });

    it("finds nothing just outside the window, after or before", async () => {
      await seedReservation({ restaurantId: restaurant.id, customerId: customer.id });

      expect(
        await reservationRepository.findActiveByCustomerInWindow(customer.id, at(SLOT, BUFFER_MS + MINUTE_MS))
      ).toBeNull();
      expect(
        await reservationRepository.findActiveByCustomerInWindow(customer.id, at(SLOT, -(BUFFER_MS + MINUTE_MS)))
      ).toBeNull();
    });

    // DOMAIN.md: the buffer is inclusive — exactly 4 hours apart is still a conflict.
    it("treats exactly 4 hours apart as a conflict", async () => {
      const existing = await seedReservation({ restaurantId: restaurant.id, customerId: customer.id });

      expect((await reservationRepository.findActiveByCustomerInWindow(customer.id, at(SLOT, BUFFER_MS)))?.id).toBe(
        existing.id
      );
      expect((await reservationRepository.findActiveByCustomerInWindow(customer.id, at(SLOT, -BUFFER_MS)))?.id).toBe(
        existing.id
      );
    });

    // DOMAIN.md: the buffer applies at any restaurant.
    it("finds a conflict at a different restaurant", async () => {
      const otherRestaurant = await seedRestaurant();
      const existing = await seedReservation({ restaurantId: otherRestaurant.id, customerId: customer.id });

      const found = await reservationRepository.findActiveByCustomerInWindow(customer.id, at(SLOT, HOUR_MS));

      expect(found?.id).toBe(existing.id);
    });

    // DOMAIN.md: only *active* reservations conflict.
    it("ignores non-active reservations", async () => {
      await seedReservation({ restaurantId: restaurant.id, customerId: customer.id, status: "canceled" });
      await seedReservation({
        restaurantId: restaurant.id,
        customerId: customer.id,
        scheduledAt: at(SLOT, HOUR_MS),
        status: "completed",
      });

      expect(await reservationRepository.findActiveByCustomerInWindow(customer.id, SLOT)).toBeNull();
    });

    it("ignores other customers' reservations", async () => {
      const otherCustomer = await seedCustomer();
      await seedReservation({ restaurantId: restaurant.id, customerId: otherCustomer.id });

      expect(await reservationRepository.findActiveByCustomerInWindow(customer.id, SLOT)).toBeNull();
    });

    // JSDoc: excludeId lets a reschedule skip the reservation being moved.
    it("skips the excluded reservation but still finds another conflict", async () => {
      const moving = await seedReservation({ restaurantId: restaurant.id, customerId: customer.id });

      expect(
        await reservationRepository.findActiveByCustomerInWindow(customer.id, at(SLOT, HOUR_MS), undefined, moving.id)
      ).toBeNull();

      const other = await seedReservation({
        restaurantId: restaurant.id,
        customerId: customer.id,
        scheduledAt: at(SLOT, 2 * HOUR_MS),
      });
      const found = await reservationRepository.findActiveByCustomerInWindow(
        customer.id,
        at(SLOT, HOUR_MS),
        undefined,
        moving.id
      );
      expect(found?.id).toBe(other.id);
    });

    // DOMAIN.md: runs inside the booking transaction — must see that tx's uncommitted rows.
    it("reads through the passed transaction", async () => {
      const found = await inRolledBackTx(async (tx) => {
        await tx.reservation.create({ data: reservationInput() });
        return reservationRepository.findActiveByCustomerInWindow(customer.id, at(SLOT, HOUR_MS), tx);
      });

      expect(found).not.toBeNull();
    });
  });
});
