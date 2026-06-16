/**
 * Unit tests for reservationService.
 * Type: unit (repositories, validateReservationDateTime, and prisma.$transaction mocked;
 *       reservationOutputDTO runs for real).
 * Covers: createReservation — role guard, datetime-validation delegation, restaurant-not-found,
 *           4-hour conflict, capacity-full, happy path (status active, people does not gate slots);
 *         updateReservation — role guard, not-found, ownership guard, active-only (regression-guard),
 *           datetime-validation delegation on reschedule, restaurant-not-found on reschedule,
 *           conflict on reschedule, capacity-full on reschedule, same-slot self-exclusion (regression-guard),
 *           people-only skips time checks (regression-guard), happy path;
 *         cancelReservation — not-found, ownership guard, active-only (regression-guard), soft-cancel sets canceled;
 *         resolveReservation — owner guard, owner-no-restaurant, not-found, wrong-restaurant,
 *           active-only (regression-guard), no-show maps to no_show, completed mapping;
 *         listOwnerReservations — owner guard, owner-no-restaurant, happy path;
 *         listCustomerReservations — customer guard, happy path.
 * Not yet covered: the numeric booking-window values (30-min minimum, ~2-month maximum) live in
 *           validateReservationDateTime (util) and the 4-hour window in findActiveByCustomerInWindow
 *           (repository) — both mocked here, assert those in their own files; the defensive
 *           `updated == null → NotFoundError` re-check after update (update/cancel/resolve).
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { reservationService } from "@/services/reservationService.js";
import { restaurantRepository, reservationRepository } from "@/repositories/index.js";
import { validateReservationDateTime } from "@/utils/index.js";
import { prisma } from "@/config/prismaClient.js";
import { NotFoundError, ValidationError, ForbiddenError } from "@/errors/index.js";
import { RESERVATION_STATUS } from "@/constants/index.js";
import { Role, type Reservation, type Restaurant } from "../../generated/prisma/index.js";
import type { UserOutput } from "@/dtos/index.js";

// vi.mock uses RELATIVE paths (not the @/ alias) — vitest's hoisted mock cannot resolve the alias.
vi.mock("../../repositories/index.js", () => ({
  restaurantRepository: {
    findById: vi.fn(),
    findByOwnerId: vi.fn(),
  },
  reservationRepository: {
    findById: vi.fn(),
    findActiveByCustomerInWindow: vi.fn(),
    countActiveBySlot: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findAll: vi.fn(),
  },
}));

vi.mock("../../utils/index.js", () => ({
  validateReservationDateTime: vi.fn(),
}));

vi.mock("../../config/prismaClient.js", () => ({
  prisma: { $transaction: vi.fn() },
}));

// $transaction is overloaded; vi.mocked() cannot resolve the interactive overload — narrow it first.
type InteractiveTxFn = (fn: (tx: typeof prisma) => Promise<unknown>) => Promise<unknown>;

const customerId = "customer-uuid-1";
const otherCustomerId = "customer-uuid-2";
const ownerId = "owner-uuid-1";
const restaurantId = "restaurant-uuid-1";
const reservationId = "reservation-uuid-1";

// validateReservationDateTime is mocked, so these instants are never range-checked here.
const slotA = new Date("2026-08-01T19:00:00.000Z");
const slotB = new Date("2026-08-02T19:00:00.000Z");

const mockCustomer: UserOutput = {
  id: customerId,
  email: "customer@example.com",
  firstname: "Cus",
  lastname: "Tomer",
  role: Role.customer,
};

const mockOwner: UserOutput = {
  id: ownerId,
  email: "owner@example.com",
  firstname: "Ow",
  lastname: "Ner",
  role: Role.owner,
};

const mockRestaurant: Restaurant = {
  id: restaurantId,
  name: "Test Bistro",
  description: "A test restaurant",
  address: "1 Main St",
  phone: "555-0100",
  capacity: 3,
  logoUrl: "logo.png",
  coverImageUrl: "cover.png",
  ownerId,
};

const mockActiveReservation: Reservation = {
  id: reservationId,
  scheduledAt: slotA,
  people: 2,
  status: RESERVATION_STATUS.ACTIVE,
  restaurantId,
  customerId,
};

describe("reservationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Interactive-transaction mock: run the callback immediately with the mocked prisma as `tx`.
    // Repositories are already individually mocked, so the tx argument is inert.
    vi.mocked(prisma.$transaction as unknown as InteractiveTxFn).mockImplementation(
      async (fn) => fn(prisma),
    );
  });

  describe("createReservation", () => {
    const createInput = { scheduledAt: slotA, people: 2 };

    it("throws ForbiddenError when the user is not a customer", async () => {
      // Oracle: DOMAIN.md roles — only customers create reservations.
      const thrown = await reservationService
        .createReservation(restaurantId, createInput, mockOwner)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ForbiddenError);
      // Role guard short-circuits before any DB or validation work.
      expect(validateReservationDateTime).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("delegates datetime validation and propagates its failure", async () => {
      // Oracle: DOMAIN.md booking window is enforced via validateReservationDateTime — the
      // service's contract is to call it; the numeric 30-min/2-month rules are tested in that util.
      // mockImplementationOnce: vi.clearAllMocks() clears call history but NOT implementations,
      // so a persistent throwing mock would leak into every later test that calls the validator.
      vi.mocked(validateReservationDateTime).mockImplementationOnce(() => {
        throw new ValidationError("Invalid reservation time", []);
      });

      const thrown = await reservationService
        .createReservation(restaurantId, createInput, mockCustomer)
        .catch((e: unknown) => e);

      expect(validateReservationDateTime).toHaveBeenCalledWith(createInput.scheduledAt);
      expect(thrown).toBeInstanceOf(ValidationError);
    });

    it("throws NotFoundError when the restaurant does not exist", async () => {
      // Oracle: JSDoc @throws {NotFoundError} If restaurant does not exist.
      vi.mocked(restaurantRepository.findById).mockResolvedValue(null);

      const thrown = await reservationService
        .createReservation(restaurantId, createInput, mockCustomer)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(NotFoundError);
    });

    it("throws ValidationError when the customer has a reservation within 4 hours", async () => {
      // Oracle: DOMAIN.md — a customer cannot have two active reservations within 4 hours.
      vi.mocked(restaurantRepository.findById).mockResolvedValue(mockRestaurant);
      vi.mocked(reservationRepository.findActiveByCustomerInWindow).mockResolvedValue(
        mockActiveReservation,
      );

      const thrown = await reservationService
        .createReservation(restaurantId, createInput, mockCustomer)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ValidationError);
      // Message distinguishes this branch from the capacity branch (same error type).
      expect((thrown as ValidationError).message).toBe(
        "You already have a reservation within 4 hours of this time",
      );
    });

    it("throws ValidationError when active reservations have reached capacity", async () => {
      // Oracle: DOMAIN.md capacity rule — booking allowed only while active count < capacity.
      vi.mocked(restaurantRepository.findById).mockResolvedValue(mockRestaurant); // capacity 3
      vi.mocked(reservationRepository.findActiveByCustomerInWindow).mockResolvedValue(null);
      vi.mocked(reservationRepository.countActiveBySlot).mockResolvedValue(3); // == capacity

      const thrown = await reservationService
        .createReservation(restaurantId, createInput, mockCustomer)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ValidationError);
      expect((thrown as ValidationError).message).toBe(
        "Restaurant is fully booked for this time slot",
      );
      expect(reservationRepository.create).not.toHaveBeenCalled();
    });

    it("creates with status active and does not let party size consume extra slots", async () => {
      // Oracle: DOMAIN.md — status is "active" on create; capacity counts SLOTS not headcount,
      // so a party of 8 still consumes exactly one slot. capacity 3, one slot taken → allowed.
      const bigParty = { scheduledAt: slotA, people: 8 };
      vi.mocked(restaurantRepository.findById).mockResolvedValue(mockRestaurant);
      vi.mocked(reservationRepository.findActiveByCustomerInWindow).mockResolvedValue(null);
      vi.mocked(reservationRepository.countActiveBySlot).mockResolvedValue(1); // < capacity
      vi.mocked(reservationRepository.create).mockResolvedValue({
        ...mockActiveReservation,
        people: 8,
      });

      const result = await reservationService.createReservation(
        restaurantId,
        bigParty,
        mockCustomer,
      );

      expect(reservationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RESERVATION_STATUS.ACTIVE,
          people: 8,
          restaurant: { connect: { id: restaurantId } },
          customer: { connect: { id: customerId } },
        }),
        expect.anything(),
      );
      expect(result.status).toBe("active");
      expect(result.people).toBe(8);
    });
  });

  describe("updateReservation", () => {
    it("throws ForbiddenError when the user is not a customer", async () => {
      // Oracle: DOMAIN.md roles — only customers update their reservations.
      const thrown = await reservationService
        .updateReservation(reservationId, { people: 4 }, mockOwner)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ForbiddenError);
    });

    it("throws NotFoundError when the reservation does not exist", async () => {
      // Oracle: JSDoc @throws {NotFoundError} If reservation does not exist.
      vi.mocked(reservationRepository.findById).mockResolvedValue(null);

      const thrown = await reservationService
        .updateReservation(reservationId, { people: 4 }, mockCustomer)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(NotFoundError);
    });

    it("throws ForbiddenError when modifying another customer's reservation", async () => {
      // Oracle: cross-user isolation — a customer may only modify their own reservation (JSDoc @throws).
      vi.mocked(reservationRepository.findById).mockResolvedValue({
        ...mockActiveReservation,
        customerId: otherCustomerId,
      });

      const thrown = await reservationService
        .updateReservation(reservationId, { people: 4 }, mockCustomer)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ForbiddenError);
    });

    it("throws ValidationError when the reservation is not active", async () => {
      // regression-guard: "only active reservations can be modified" is NOT stated in DOMAIN.md.
      // Asserts current behavior; promote to an intent check once the rule is documented.
      vi.mocked(reservationRepository.findById).mockResolvedValue({
        ...mockActiveReservation,
        status: RESERVATION_STATUS.CANCELED,
      });

      const thrown = await reservationService
        .updateReservation(reservationId, { people: 4 }, mockCustomer)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ValidationError);
    });

    it("skips all time-based checks for a people-only update", async () => {
      // regression-guard: gating the time checks on scheduledAt changing is an implementation
      // detail, not a documented business rule.
      vi.mocked(reservationRepository.findById).mockResolvedValue(mockActiveReservation);
      vi.mocked(reservationRepository.update).mockResolvedValue({
        ...mockActiveReservation,
        people: 5,
      });

      await reservationService.updateReservation(reservationId, { people: 5 }, mockCustomer);

      expect(validateReservationDateTime).not.toHaveBeenCalled();
      expect(reservationRepository.countActiveBySlot).not.toHaveBeenCalled();
    });

    it("delegates datetime validation when scheduledAt changes and propagates its failure", async () => {
      // Oracle: JSDoc — scheduledAt must pass validateReservationDateTime when changed.
      // Mirrors the same delegation contract as createReservation but gated on scheduledAt being present.
      vi.mocked(reservationRepository.findById).mockResolvedValue(mockActiveReservation);
      vi.mocked(validateReservationDateTime).mockImplementationOnce(() => {
        throw new ValidationError("Invalid reservation time", []);
      });

      const thrown = await reservationService
        .updateReservation(reservationId, { scheduledAt: slotB }, mockCustomer)
        .catch((e: unknown) => e);

      expect(validateReservationDateTime).toHaveBeenCalledWith(slotB);
      expect(thrown).toBeInstanceOf(ValidationError);
    });

    it("throws ValidationError when the new time conflicts within 4 hours", async () => {
      // Oracle: DOMAIN.md 4-hour per-customer buffer (applied to the new time, excluding self).
      vi.mocked(reservationRepository.findById).mockResolvedValue(mockActiveReservation);
      vi.mocked(reservationRepository.findActiveByCustomerInWindow).mockResolvedValue(
        mockActiveReservation,
      );

      const thrown = await reservationService
        .updateReservation(reservationId, { scheduledAt: slotB }, mockCustomer)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ValidationError);
      expect((thrown as ValidationError).message).toBe(
        "You already have a reservation within 4 hours of this time",
      );
    });

    it("throws NotFoundError when the restaurant no longer exists during a reschedule", async () => {
      // Oracle: JSDoc @throws {NotFoundError} If restaurant does not exist.
      // This path is only reachable when scheduledAt changes — the restaurant lookup is
      // skipped entirely for people-only updates.
      vi.mocked(reservationRepository.findById).mockResolvedValue(mockActiveReservation);
      vi.mocked(reservationRepository.findActiveByCustomerInWindow).mockResolvedValue(null);
      vi.mocked(restaurantRepository.findById).mockResolvedValue(null);

      const thrown = await reservationService
        .updateReservation(reservationId, { scheduledAt: slotB }, mockCustomer)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(NotFoundError);
    });

    it("throws ValidationError when the new slot is at capacity", async () => {
      // Oracle: DOMAIN.md capacity rule applied to the new slot.
      vi.mocked(reservationRepository.findById).mockResolvedValue(mockActiveReservation);
      vi.mocked(reservationRepository.findActiveByCustomerInWindow).mockResolvedValue(null);
      vi.mocked(restaurantRepository.findById).mockResolvedValue(mockRestaurant); // capacity 3
      vi.mocked(reservationRepository.countActiveBySlot).mockResolvedValue(3); // different slot → no -1

      const thrown = await reservationService
        .updateReservation(reservationId, { scheduledAt: slotB }, mockCustomer)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ValidationError);
      expect((thrown as ValidationError).message).toBe(
        "Restaurant is fully booked for the new time slot",
      );
    });

    it("excludes the reservation itself from the count when the slot is unchanged", async () => {
      // regression-guard: the same-slot -1 self-exclusion is not documented in DOMAIN.md.
      // Same slot at full count must still succeed (effective = count - 1 < capacity).
      vi.mocked(reservationRepository.findById).mockResolvedValue(mockActiveReservation); // slotA
      vi.mocked(reservationRepository.findActiveByCustomerInWindow).mockResolvedValue(null);
      vi.mocked(restaurantRepository.findById).mockResolvedValue(mockRestaurant); // capacity 3
      vi.mocked(reservationRepository.countActiveBySlot).mockResolvedValue(3); // == capacity, same slot
      vi.mocked(reservationRepository.update).mockResolvedValue({
        ...mockActiveReservation,
        people: 6,
      });

      const result = await reservationService.updateReservation(
        reservationId,
        { scheduledAt: slotA, people: 6 },
        mockCustomer,
      );

      expect(result.id).toBe(reservationId);
    });

    it("updates the reservation on a valid reschedule", async () => {
      // Oracle: DOMAIN.md — a valid reschedule under capacity succeeds and returns the updated DTO.
      vi.mocked(reservationRepository.findById).mockResolvedValue(mockActiveReservation);
      vi.mocked(reservationRepository.findActiveByCustomerInWindow).mockResolvedValue(null);
      vi.mocked(restaurantRepository.findById).mockResolvedValue(mockRestaurant);
      vi.mocked(reservationRepository.countActiveBySlot).mockResolvedValue(1); // < capacity
      vi.mocked(reservationRepository.update).mockResolvedValue({
        ...mockActiveReservation,
        scheduledAt: slotB,
      });

      const result = await reservationService.updateReservation(
        reservationId,
        { scheduledAt: slotB },
        mockCustomer,
      );

      expect(reservationRepository.update).toHaveBeenCalledWith(
        reservationId,
        expect.objectContaining({ scheduledAt: slotB }),
        expect.anything(),
      );
      expect(result.scheduledAt).toEqual(slotB);
    });
  });

  describe("cancelReservation", () => {
    it("throws NotFoundError when the reservation does not exist", async () => {
      // Oracle: JSDoc @throws {NotFoundError}.
      vi.mocked(reservationRepository.findById).mockResolvedValue(null);

      const thrown = await reservationService
        .cancelReservation(reservationId, mockCustomer)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(NotFoundError);
    });

    it("throws ForbiddenError when cancelling another customer's reservation", async () => {
      // Oracle: cross-user isolation (JSDoc @throws {ForbiddenError}).
      vi.mocked(reservationRepository.findById).mockResolvedValue({
        ...mockActiveReservation,
        customerId: otherCustomerId,
      });

      const thrown = await reservationService
        .cancelReservation(reservationId, mockCustomer)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ForbiddenError);
    });

    it("throws ValidationError when the reservation is not active", async () => {
      // regression-guard: "only active reservations can be canceled" is not stated in DOMAIN.md.
      vi.mocked(reservationRepository.findById).mockResolvedValue({
        ...mockActiveReservation,
        status: RESERVATION_STATUS.COMPLETED,
      });

      const thrown = await reservationService
        .cancelReservation(reservationId, mockCustomer)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ValidationError);
    });

    it("soft-cancels by setting status to canceled rather than deleting", async () => {
      // Oracle: DOMAIN.md soft cancel — sets status to "canceled"; hard deletes do not exist.
      vi.mocked(reservationRepository.findById).mockResolvedValue(mockActiveReservation);
      vi.mocked(reservationRepository.update).mockResolvedValue({
        ...mockActiveReservation,
        status: RESERVATION_STATUS.CANCELED,
      });

      const result = await reservationService.cancelReservation(reservationId, mockCustomer);

      expect(reservationRepository.update).toHaveBeenCalledWith(
        reservationId,
        { status: RESERVATION_STATUS.CANCELED },
        expect.anything(),
      );
      expect(result.status).toBe("canceled");
    });
  });

  describe("resolveReservation", () => {
    it("throws ForbiddenError when the user is not an owner", async () => {
      // Oracle: DOMAIN.md roles — only owners resolve reservations.
      const thrown = await reservationService
        .resolveReservation(reservationId, "completed", mockCustomer)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ForbiddenError);
    });

    it("throws ValidationError when the owner has no assigned restaurant", async () => {
      // Oracle: JSDoc @throws {ValidationError} If the owner has no assigned restaurant.
      vi.mocked(restaurantRepository.findByOwnerId).mockResolvedValue(null);

      const thrown = await reservationService
        .resolveReservation(reservationId, "completed", mockOwner)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ValidationError);
    });

    it("throws NotFoundError when the reservation does not exist", async () => {
      // Oracle: JSDoc @throws {NotFoundError}.
      vi.mocked(restaurantRepository.findByOwnerId).mockResolvedValue(mockRestaurant);
      vi.mocked(reservationRepository.findById).mockResolvedValue(null);

      const thrown = await reservationService
        .resolveReservation(reservationId, "completed", mockOwner)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(NotFoundError);
    });

    it("throws ForbiddenError when the reservation belongs to another restaurant", async () => {
      // Oracle: an owner may only resolve reservations for their own restaurant (JSDoc @throws).
      vi.mocked(restaurantRepository.findByOwnerId).mockResolvedValue(mockRestaurant);
      vi.mocked(reservationRepository.findById).mockResolvedValue({
        ...mockActiveReservation,
        restaurantId: "other-restaurant-uuid",
      });

      const thrown = await reservationService
        .resolveReservation(reservationId, "completed", mockOwner)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ForbiddenError);
    });

    it("throws ValidationError when the reservation is not active", async () => {
      // regression-guard: "only active reservations can be resolved" is not stated in DOMAIN.md.
      vi.mocked(restaurantRepository.findByOwnerId).mockResolvedValue(mockRestaurant);
      vi.mocked(reservationRepository.findById).mockResolvedValue({
        ...mockActiveReservation,
        status: RESERVATION_STATUS.CANCELED,
      });

      const thrown = await reservationService
        .resolveReservation(reservationId, "completed", mockOwner)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ValidationError);
    });

    it("maps the API status 'no-show' to the stored 'no_show' and back out", async () => {
      // Oracle: DOMAIN.md hyphen trap — API "no-show" is stored as no_show and the DTO maps it back.
      vi.mocked(restaurantRepository.findByOwnerId).mockResolvedValue(mockRestaurant);
      vi.mocked(reservationRepository.findById).mockResolvedValue(mockActiveReservation);
      vi.mocked(reservationRepository.update).mockResolvedValue({
        ...mockActiveReservation,
        status: RESERVATION_STATUS.NO_SHOW,
      });

      const result = await reservationService.resolveReservation(
        reservationId,
        "no-show",
        mockOwner,
      );

      expect(reservationRepository.update).toHaveBeenCalledWith(
        reservationId,
        { status: RESERVATION_STATUS.NO_SHOW },
        expect.anything(),
      );
      expect(result.status).toBe("no-show");
    });

    it("resolves a reservation as completed", async () => {
      // Oracle: DOMAIN.md status semantics — "completed" set by the owner via /resolve.
      vi.mocked(restaurantRepository.findByOwnerId).mockResolvedValue(mockRestaurant);
      vi.mocked(reservationRepository.findById).mockResolvedValue(mockActiveReservation);
      vi.mocked(reservationRepository.update).mockResolvedValue({
        ...mockActiveReservation,
        status: RESERVATION_STATUS.COMPLETED,
      });

      const result = await reservationService.resolveReservation(
        reservationId,
        "completed",
        mockOwner,
      );

      expect(reservationRepository.update).toHaveBeenCalledWith(
        reservationId,
        { status: RESERVATION_STATUS.COMPLETED },
        expect.anything(),
      );
      expect(result.status).toBe("completed");
    });
  });

  describe("listOwnerReservations", () => {
    it("throws ForbiddenError when the user is not an owner", async () => {
      // Oracle: DOMAIN.md roles — owner-only view.
      const thrown = await reservationService
        .listOwnerReservations(mockCustomer)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ForbiddenError);
    });

    it("throws ValidationError when the owner has no assigned restaurant", async () => {
      // Oracle: JSDoc @throws {ValidationError} If the owner has no assigned restaurant.
      vi.mocked(restaurantRepository.findByOwnerId).mockResolvedValue(null);

      const thrown = await reservationService
        .listOwnerReservations(mockOwner)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ValidationError);
    });

    it("returns the owner's restaurant reservations as DTOs", async () => {
      // Oracle: owner view lists reservations scoped to the owner's restaurant.
      vi.mocked(restaurantRepository.findByOwnerId).mockResolvedValue(mockRestaurant);
      vi.mocked(reservationRepository.findAll).mockResolvedValue([mockActiveReservation]);

      const result = await reservationService.listOwnerReservations(mockOwner);

      expect(reservationRepository.findAll).toHaveBeenCalledWith({ restaurantId });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(reservationId);
    });
  });

  describe("listCustomerReservations", () => {
    it("throws ForbiddenError when the user is not a customer", async () => {
      // Oracle: DOMAIN.md roles — customer-only view.
      const thrown = await reservationService
        .listCustomerReservations(mockOwner)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ForbiddenError);
    });

    it("returns the customer's own reservations as DTOs", async () => {
      // Oracle: customer view lists reservations scoped to the authenticated customer.
      vi.mocked(reservationRepository.findAll).mockResolvedValue([mockActiveReservation]);

      const result = await reservationService.listCustomerReservations(mockCustomer);

      expect(reservationRepository.findAll).toHaveBeenCalledWith({ customerId });
      expect(result).toHaveLength(1);
      expect(result[0].customerId).toBe(customerId);
    });
  });
});
