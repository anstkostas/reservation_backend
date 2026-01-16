const { sequelize } = require("../models");
const {
  restaurantRepository,
  reservationRepository,
} = require("../repositories");
const { reservationDTO } = require("../dtos");
const { dateTimeUtils } = require("../utils");
const { NotFoundError, ValidationError, ForbiddenError } = require("../errors");
const { RESERVATION_STATUS } = require("../constants");


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
   * - Reservation date and time are validated (not in the past, within allowed range of two months).
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
        lock: transaction.LOCK.UPDATE, // Only one query can access this row at a time locking it until the transaction is completed, prevents race conditions
      });
      if (!restaurant) {
        throw new NotFoundError("Restaurant not found");
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

      createDTO.status = RESERVATION_STATUS.ACTIVE;
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

      if (existing.status !== RESERVATION_STATUS.ACTIVE) {
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

  /**
   * Soft-deletes a reservation by setting its status to 'canceled'.
   *
   * @async
   * @param {number} id - The ID of the reservation to cancel.
   * @param {Object} customer - The authenticated customer object.
   * @returns {Promise<Object>} The updated reservation DTO.
   * @throws {NotFoundError} If the reservation is not found.
   * @throws {ForbiddenError} If the reservation belongs to another customer.
   * @throws {ValidationError} If the reservation is not active.
   */
  async cancelReservation(id, customer) {
    const reservation = await reservationRepository.findById(id);
    if (!reservation) {
      throw new NotFoundError("Reservation not found");
    }

    if (reservation.customerId !== customer.id) {
      throw new ForbiddenError("Cannot cancel another customer's reservation");
    }

    if (reservation.status !== RESERVATION_STATUS.ACTIVE) {
      throw new ValidationError("Only active reservations can be canceled");
    }

    // Instead of hard-delete change status to "canceled".
    const updated = await reservationRepository.update(id, {
      status: RESERVATION_STATUS.CANCELED,
    });

    return reservationDTO.reservationOutputDTO(updated);
  },

  /**
   * Resolves a reservation (marks as completed or no-show).
   *
   * @async
   * @param {number} id - The ID of the reservation to resolve.
   * @param {string} status - The new status (completed or no_show).
   * @param {Object} user - The authenticated owner user object.
   * @returns {Promise<Object>} The updated reservation DTO.
   * @throws {ValidationError} If the user is not an owner, status is invalid, or owner has no restaurant.
   * @throws {NotFoundError} If the reservation is not found.
   * @throws {ForbiddenError} If the reservation belongs to another restaurant.
   */
  async resolveReservation(id, status, user) {
    if (user.role !== "owner") {
      throw new ValidationError("Only owners can mark a reservation as completed or no-show");
    }

    if (![RESERVATION_STATUS.COMPLETED, RESERVATION_STATUS.NO_SHOW].includes(status)) {
      throw new ValidationError("Invalid status update");
    }

    const restaurant = await restaurantRepository.findByOwnerId(user.id);
    if (!restaurant)
      throw new ValidationError("Owner has no assigned restaurant");

    const reservation = await reservationRepository.findById(id);
    if (!reservation) throw new NotFoundError("Reservation not found");

    if (reservation.restaurantId !== restaurant.id) {
      throw new ForbiddenError(
        "Cannot resolve reservation for another restaurant"
      );
    }

    if (reservation.status !== RESERVATION_STATUS.ACTIVE) {
      throw new ValidationError("Only active reservations can be resolved");
    }

    // Update status
    const updated = await reservationRepository.update(id, {
      status: status,
    });

    return reservationDTO.reservationOutputDTO(updated);
  },

  /**
   * Lists all reservations for a restaurant owner.
   *
   * @async
   * @param {Object} user - The authenticated owner user object.
   * @returns {Promise<Array<Object>>} A list of reservation DTOs.
   * @throws {ForbiddenError} If the user is not an owner.
   * @throws {ValidationError} If the owner has no assigned restaurant.
   */
  async listOwnerReservations(user) {
    if (user.role === "customer") {
      throw new ForbiddenError("Only owners can view active reservations");
    }

    const restaurant = await restaurantRepository.findByOwnerId(user.id);
    if (!restaurant)
      throw new ValidationError("Owner has no assigned restaurant");

    const reservations = await reservationRepository.findAll({
      restaurantId: restaurant.id,
      // Status not filtered, returns all
    });

    // return reservations.map((reservation) =>
    //   reservationDTO.reservationOutputDTO(reservation)
    // );
    return reservations.map(reservationDTO.reservationOutputDTO); // A more consice way of omitting parameter.
  },

  /**
   * Lists all reservations for a customer.
   * @async
   * @param {Object} customer - The authenticated customer user object.
   * @returns {Promise<Array<Object>>} A list of reservation DTOs.
   * @throws {ForbiddenError} If the user is not a customer.
   */
  async listCustomerReservations(customer) {
    if (customer.role !== "customer") {
      throw new ForbiddenError("Only customers can view their reservations");
    }

    const reservations = await reservationRepository.findAll({
      customerId: customer.id,
    });
    return reservations.map(reservationDTO.reservationOutputDTO);
  },
};
