const { sequelize } = require("../models");
const {
  restaurantRepository,
  reservationRepository,
} = require("../repositories");
const { reservationDTO } = require("../dtos");
const { dateTimeUtils } = require("../utils");
const { NotFoundError, ValidationError, ForbiddenError } = require("../errors");

module.exports = {
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
   * - Reservation date and time are validated (not in the past, within allowed range).
   * - Number of persons cannot exceed restaurant capacity.
   * - Overbooking prevention: active reservations for the same slot cannot exceed capacity.
   * - Status is set to "active" on creation.
   *
   * Error handling:
   * - SequelizeValidationError is normalized and thrown as ValidationError.
   * - Business rule violations throw ValidationError or NotFoundError.
   *
   * @param {number} restaurantId - ID of the restaurant
   * @param {Object} data - Reservation input data
   * @param {Object} customer - Authenticated user object
   * @returns {Promise<Object>} Reservation output DTO
   * @throws {ValidationError} If any business rule or validation fails
   * @throws {NotFoundError} If restaurant does not exist
   * @throws {ForbiddenError} If user role is not "customer"
   */
  async createReservation(restaurantId, data, customer) {
    const transaction = await sequelize.transaction();
    try {
      if (customer.role !== "customer")
        throw new ValidationError("Only customers can make reservations");

      if (!restaurantId) throw new ValidationError("RestaurantId required");

      const createDTO = reservationDTO.createReservationInputDTO(data);

      dateTimeUtils.validateReservationDateTime(createDTO.date, createDTO.time);
      createDTO.restaurantId = restaurantId;
      createDTO.customerId = customer.id;
      const restaurant = await restaurantRepository.findById(restaurantId, {
        transaction,
        lock: transaction.LOCK.UPDATE, // 🔒 THIS IS THE KEY
      });
      if (!restaurant) {
        throw new NotFoundError("Restaurant not found");
      }

      if (createDTO.persons > restaurant.capacity) {
        throw new ValidationError("Persons exceed restaurant capacity");
      }

      // --- overbooking check ---
      const reservedTables = await reservationRepository.countActiveBySlot(
        restaurantId,
        createDTO.date,
        createDTO.time,
        { transaction }
      );

      if (reservedTables >= restaurant.capacity) {
        throw new ValidationError(
          "Restaurant is fully booked for this time slot"
        );
      }

      createDTO.status = "active";
      const reservation = await reservationRepository.create(createDTO, {
        transaction,
      });
      await transaction.commit();
      return reservationDTO.reservationOutputDTO(reservation);
    } catch (err) {
      await transaction.rollback();
      if (err.name === "SequelizeValidationError") {
        throw ValidationError.fromSequelize(err);
      }
      throw err;
    }
  },

  /**
   * Updates an existing reservation for a customer.
   *
   * IMPORTANT:
   * - This method uses a TRANSACTION if date or time is being changed.
   * - The transaction ensures the overbooking check and reservation update
   *   happen atomically, preventing race conditions.
   *
   * Business rules enforced:
   * - Only customers can update their own reservations.
   * - Only active reservations can be modified.
   * - Reservation date/time are validated if updated.
   * - Overbooking prevention: active reservations for the new slot cannot exceed capacity.
   * - Reservation ownership (customerId, restaurantId) cannot be changed.
   *
   * Error handling:
   * - SequelizeValidationError is normalized and thrown as ValidationError.
   * - Business rule violations throw ValidationError, NotFoundError, or ForbiddenError.
   *
   * @param {number} id - Reservation ID
   * @param {Object} data - Partial update payload
   * @param {Object} customer - Authenticated user object
   * @returns {Promise<Object>} Updated reservation output DTO
   * @throws {ValidationError} If input validation fails or business rules violated
   * @throws {NotFoundError} If reservation or restaurant does not exist
   * @throws {ForbiddenError} If user attempts to modify another customer's reservation
   */
  async updateReservation(id, data, customer) {
    const transaction = await sequelize.transaction();
    try {
      if (customer.role !== "customer")
        throw new ForbiddenError("Only customers can update reservations");

      const existing = await reservationRepository.findById(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!existing) {
        throw new NotFoundError("Reservation not found");
      }

      if (existing.customerId !== customer.id) {
        throw new ForbiddenError(
          "Not allowed to modify another person's reservation"
        );
      }

      if (existing.status !== "active") {
        throw new ValidationError("Only active reservations can be modified");
      }

      const updateDTO = reservationDTO.updateReservationInputDTO(data);

      const newDate = updateDTO.date ?? existing.date;
      const newTime = updateDTO.time ?? existing.time;
      dateTimeUtils.validateReservationDateTime(newDate, newTime);

      if ("customerId" in updateDTO || "restaurantId" in updateDTO) {
        throw new ValidationError("Cannot modify reservation ownership");
      }
      // Check overbooking only if date or time changed
      if (updateDTO.date || updateDTO.time) {
        const restaurant = await restaurantRepository.findById(
          existing.restaurantId,
          {
            transaction,
            lock: transaction.LOCK.UPDATE,
          }
        );
        if (!restaurant) throw new NotFoundError("Restaurant not found");

        const reservedTables = await reservationRepository.countActiveBySlot(
          existing.restaurantId,
          newDate,
          newTime,
          { transaction }
        );

        // If user is moving their own reservation to this slot, exclude their current one
        const effectiveReserved =
          existing.date === newDate && existing.time === newTime
            ? reservedTables - 1
            : reservedTables;

        if (effectiveReserved >= restaurant.capacity) {
          throw new ValidationError(
            "Restaurant is fully booked for the new time slot"
          );
        }
      }

      const updated = await reservationRepository.update(id, updateDTO, {
        transaction,
      });
      await transaction.commit();
      return reservationDTO.reservationOutputDTO(updated);
    } catch (err) {
      await transaction.rollback();
      if (err.name === "SequelizeValidationError") {
        throw ValidationError.fromSequelize(err);
      }
      throw err;
    }
  },

  // soft-delete
  async cancelReservation(id, customer) {
    const reservation = await reservationRepository.findById(id);
    if (!reservation) {
      throw new NotFoundError("Reservation not found");
    }

    if (reservation.customerId !== customer.id) {
      throw new ForbiddenError("Cannot cancel another customer's reservation");
    }

    if (reservation.status !== "active") {
      throw new ValidationError("Only active reservations can be canceled");
    }

    // Instead of hard-delete change status to "canceled".
    const updated = await reservationRepository.update(id, {
      status: "canceled",
    });

    return reservationDTO.reservationOutputDTO(updated);
  },

  async completeReservation(id, user) {
    if (user.role !== "owner") {
      throw new ValidationError("Only owners can complete reservations");
    }

    const restaurant = await restaurantRepository.findByOwnerId(user.id);
    if (!restaurant)
      throw new ValidationError("Owner has no assigned restaurant");

    const reservation = await reservationRepository.findById(id);
    if (!reservation) throw new NotFoundError("Reservation not found");

    if (reservation.restaurantId !== restaurant.id) {
      throw new ForbiddenError(
        "Cannot complete reservation for another restaurant"
      );
    }

    if (reservation.status !== "active") {
      throw new ValidationError("Only active reservations can be completed");
    }

    // Update status
    const updated = await reservationRepository.update(id, {
      status: "completed",
    });

    return reservationDTO.reservationOutputDTO(updated);
  },

  async listActiveReservationsOfOwner(user) {
    if (user.role === "customer") {
      throw new ForbiddenError("Only owners can view active reservations");
    }

    const restaurant = await restaurantRepository.findByOwnerId(user.id);
    if (!restaurant)
      throw new ValidationError("Owner has no assigned restaurant");

    const reservations = await reservationRepository.findAll({
      restaurantId: restaurant.id,
      status: "active",
    });

    // return reservations.map((reservation) =>
    //   reservationDTO.reservationOutputDTO(reservation)
    // );
    return reservations.map(reservationDTO.reservationOutputDTO); // A more consice way!
  },
};
