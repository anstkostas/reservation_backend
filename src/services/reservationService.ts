import { prisma } from "../config/prismaClient.js";
import { Prisma, Role } from "../generated/prisma/index.js";
import {
  restaurantRepository,
  reservationRepository,
} from "../repositories/index.js";
import {
  reservationOutputDTO,
  type ReservationOutput,
} from "../dtos/index.js";
import {
  validateReservationDateTime,
  normalizeDBTime,
  parseTimeString,
} from "../utils/index.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../errors/index.js";
import { RESERVATION_STATUS } from "../constants/index.js";
import type {
  CreateReservationInput,
  UpdateReservationInput,
  ReservationStatusInput,
} from "../validation/index.js";
import type { UserOutput } from "../dtos/index.js";

export const reservationService = {
  /**
   * Creates a new reservation for a customer at a specific restaurant and time.
   *
   * IMPORTANT:
   * - This method is TRANSACTIONAL.
   * - The transaction ensures that the overbooking check and reservation creation
   *   happen atomically, preventing race conditions.
   *
   * Business rules enforced:
   * - Only customers can create reservations.
   * - Reservation date and time are validated (not in the past, within allowed range of two months).
   * - Overbooking prevention: active reservations for the same slot cannot exceed capacity.
   * - Status is set to "active" on creation.
   *
   * @param {string} restaurantId - UUID of the restaurant
   * @param {CreateReservationInput} data - Validated reservation input (Zod-inferred)
   * @param {UserOutput} customer - Authenticated customer from req.user
   * @returns {Promise<ReservationOutput>} Reservation output DTO
   * @throws {ForbiddenError} If user role is not "customer"
   * @throws {ValidationError} If any business rule or validation fails
   * @throws {NotFoundError} If restaurant does not exist
   */
  async createReservation(
    restaurantId: string,
    data: CreateReservationInput,
    customer: UserOutput
  ): Promise<ReservationOutput> {
    if (customer.role !== Role.customer)
      throw new ForbiddenError("Only customers can make reservations");

    // Validate before entering the transaction — pure check, no DB access needed
    validateReservationDateTime(data.date, data.time);

    return prisma.$transaction(async (tx) => {
      const restaurant = await restaurantRepository.findById(restaurantId, tx);
      if (!restaurant) throw new NotFoundError("Restaurant not found");

      // countActiveBySlot appends FOR UPDATE when tx is provided — locks matched rows
      // to prevent overbooking race conditions on concurrent bookings for the same slot
      const reservedTables = await reservationRepository.countActiveBySlot(
        restaurantId,
        data.date,
        data.time,
        tx
      );

      if (reservedTables >= restaurant.capacity) {
        throw new ValidationError("Restaurant is fully booked for this time slot");
      }

      const createInput: Prisma.ReservationCreateInput = {
        date: data.date,
        time: parseTimeString(data.time),
        persons: data.persons,
        status: RESERVATION_STATUS.ACTIVE,
        restaurant: { connect: { id: restaurantId } },
        customer: { connect: { id: customer.id } },
      };

      const reservation = await reservationRepository.create(createInput, tx);
      return reservationOutputDTO(reservation);
    });
  },

  /**
   * Updates an existing reservation for a customer.
   *
   * IMPORTANT:
   * - This method is TRANSACTIONAL.
   * - When date or time changes, the capacity check and update happen atomically
   *   to prevent race conditions on concurrent bookings for the same slot.
   *
   * Business rules enforced:
   * - Only customers can update their own reservations.
   * - Only active reservations can be modified.
   * - Reservation date/time are validated if updated.
   * - Overbooking prevention: active reservations for the new slot cannot exceed capacity.
   *
   * @param {string} id - Reservation UUID
   * @param {UpdateReservationInput} data - Partial validated update payload (Zod-inferred)
   * @param {UserOutput} customer - Authenticated customer from req.user
   * @returns {Promise<ReservationOutput>} Updated reservation output DTO
   * @throws {ForbiddenError} If user attempts to modify another customer's reservation
   * @throws {ValidationError} If input validation fails or business rules violated
   * @throws {NotFoundError} If reservation or restaurant does not exist
   */
  async updateReservation(
    id: string,
    data: UpdateReservationInput,
    customer: UserOutput
  ): Promise<ReservationOutput> {
    if (customer.role !== Role.customer)
      throw new ForbiddenError("Only customers can update reservations");

    return prisma.$transaction(async (tx) => {
      const existing = await reservationRepository.findById(id, tx);
      if (!existing) throw new NotFoundError("Reservation not found");

      if (existing.customerId !== customer.id) {
        throw new ForbiddenError("Not allowed to modify another person's reservation");
      }

      if (existing.status !== RESERVATION_STATUS.ACTIVE) {
        throw new ValidationError("Only active reservations can be modified");
      }

      const newDate = data.date ?? existing.date;
      // normalizeDBTime converts Prisma's DATE-typed time column to HH:MM string,
      // matching the shape that Zod validation and countActiveBySlot both expect
      const newTime = data.time ?? normalizeDBTime(existing.time);

      validateReservationDateTime(newDate, newTime);

      if (data.date !== undefined || data.time !== undefined) {
        const restaurant = await restaurantRepository.findById(
          existing.restaurantId,
          tx
        );
        if (!restaurant) throw new NotFoundError("Restaurant not found");

        const reservedTables = await reservationRepository.countActiveBySlot(
          existing.restaurantId,
          newDate,
          newTime,
          tx
        );

        // If the customer is moving to a slot they already occupy, their current
        // reservation would be counted — subtract 1 to avoid false overbooking
        const isSameSlot =
          existing.date.getTime() === newDate.getTime() &&
          normalizeDBTime(existing.time) === newTime;
        const effectiveReserved = isSameSlot ? reservedTables - 1 : reservedTables;

        if (effectiveReserved >= restaurant.capacity) {
          throw new ValidationError(
            "Restaurant is fully booked for the new time slot"
          );
        }
      }

      const updatePayload: Prisma.ReservationUpdateInput = {};
      if (data.date !== undefined) updatePayload.date = data.date;
      if (data.time !== undefined) updatePayload.time = parseTimeString(data.time);
      if (data.persons !== undefined) updatePayload.persons = data.persons;

      const updated = await reservationRepository.update(id, updatePayload, tx);
      if (!updated) throw new NotFoundError("Reservation not found");
      return reservationOutputDTO(updated);
    });
  },

  /**
   * Soft-cancels a reservation by setting its status to 'canceled'.
   *
   * @param {string} id - The UUID of the reservation to cancel
   * @param {UserOutput} customer - The authenticated customer from req.user
   * @returns {Promise<ReservationOutput>} The updated reservation DTO
   * @throws {NotFoundError} If the reservation is not found
   * @throws {ForbiddenError} If the reservation belongs to another customer
   * @throws {ValidationError} If the reservation is not active
   */
  async cancelReservation(
    id: string,
    customer: UserOutput
  ): Promise<ReservationOutput> {
    return prisma.$transaction(async (tx) => {
      const reservation = await reservationRepository.findById(id, tx);
      if (!reservation) throw new NotFoundError("Reservation not found");

      if (reservation.customerId !== customer.id) {
        throw new ForbiddenError("Cannot cancel another customer's reservation");
      }

      if (reservation.status !== RESERVATION_STATUS.ACTIVE) {
        throw new ValidationError("Only active reservations can be canceled");
      }

      // Soft cancel — sets status to "canceled" instead of deleting the row
      const updated = await reservationRepository.update(id, {
        status: RESERVATION_STATUS.CANCELED,
      }, tx);
      if (!updated) throw new NotFoundError("Reservation not found");
      return reservationOutputDTO(updated);
    });
  },

  /**
   * Resolves a reservation by marking it as completed or no-show.
   *
   * @param {string} id - The UUID of the reservation to resolve
   * @param {ReservationStatusInput["status"]} status - Resolution status ("completed" or "no-show")
   * @param {UserOutput} user - The authenticated owner from req.user
   * @returns {Promise<ReservationOutput>} The updated reservation DTO
   * @throws {ForbiddenError} If the user is not an owner, or reservation belongs to another restaurant
   * @throws {ValidationError} If the owner has no assigned restaurant, or reservation is not active
   * @throws {NotFoundError} If the reservation is not found
   */
  async resolveReservation(
    id: string,
    status: ReservationStatusInput["status"],
    user: UserOutput
  ): Promise<ReservationOutput> {
    if (user.role !== Role.owner) {
      throw new ForbiddenError(
        "Only owners can mark a reservation as completed or no-show"
      );
    }

    return prisma.$transaction(async (tx) => {
      const restaurant = await restaurantRepository.findByOwnerId(user.id);
      if (!restaurant) throw new ValidationError("Owner has no assigned restaurant");

      const reservation = await reservationRepository.findById(id, tx);
      if (!reservation) throw new NotFoundError("Reservation not found");

      if (reservation.restaurantId !== restaurant.id) {
        throw new ForbiddenError("Cannot resolve reservation for another restaurant");
      }

      if (reservation.status !== RESERVATION_STATUS.ACTIVE) {
        throw new ValidationError("Only active reservations can be resolved");
      }

      // Zod validates "no-show" (hyphen) but Prisma stores no_show (underscore) internally
      const prismaStatus =
        status === "no-show"
          ? RESERVATION_STATUS.NO_SHOW
          : RESERVATION_STATUS.COMPLETED;

      const updated = await reservationRepository.update(id, { status: prismaStatus }, tx);
      if (!updated) throw new NotFoundError("Reservation not found");
      return reservationOutputDTO(updated);
    });
  },

  /**
   * Lists all reservations for a restaurant owner.
   *
   * @param {UserOutput} user - The authenticated owner from req.user
   * @returns {Promise<ReservationOutput[]>} A list of reservation DTOs
   * @throws {ForbiddenError} If the user is not an owner
   * @throws {ValidationError} If the owner has no assigned restaurant
   */
  async listOwnerReservations(user: UserOutput): Promise<ReservationOutput[]> {
    if (user.role !== Role.owner) {
      throw new ForbiddenError("Only owners can view active reservations");
    }

    const restaurant = await restaurantRepository.findByOwnerId(user.id);
    if (!restaurant) throw new ValidationError("Owner has no assigned restaurant");

    const reservations = await reservationRepository.findAll({
      restaurantId: restaurant.id,
    });

    return reservations.map(reservationOutputDTO);
  },

  /**
   * Lists all reservations for a customer.
   *
   * @param {UserOutput} customer - The authenticated customer from req.user
   * @returns {Promise<ReservationOutput[]>} A list of reservation DTOs
   * @throws {ForbiddenError} If the user is not a customer
   */
  async listCustomerReservations(customer: UserOutput): Promise<ReservationOutput[]> {
    if (customer.role !== Role.customer) {
      throw new ForbiddenError("Only customers can view their reservations");
    }

    const reservations = await reservationRepository.findAll({
      customerId: customer.id,
    });

    return reservations.map(reservationOutputDTO);
  },
};
