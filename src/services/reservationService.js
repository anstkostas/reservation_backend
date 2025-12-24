const {
  restaurantRepository,
  reservationRepository,
} = require("../repositories");
const { reservationDTO } = require("../dtos");
const { dateTimeUtils } = require("../utils");
const { NotFoundError, ValidationError, ForbiddenError } = require("../errors");

module.exports = {
  async createReservation(restaurantId, data, customer) {
    if (customer.role !== "customer")
      throw new ValidationError("Only customers can make reservations");

    const createDTO = reservationDTO.createReservationInputDTO(data);

    dateTimeUtils.validateReservationDateTime(createDTO.date, createDTO.time);

    if (!restaurantId) throw new ValidationError("RestaurantId required");
    createDTO.restaurantId = restaurantId;
    createDTO.customerId = customer.id;

    const restaurant = await restaurantRepository.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundError("Restaurant not found");
    }

    if (createDTO.persons > restaurant.capacity) {
      throw new ValidationError("Persons exceed restaurant capacity");
    }

    // --- overbooking check ---
    // Should go to repository level, prevent race conditions(2 or more reservations are booked at the same time)
    const existingReservations = await reservationRepository.findAll({
      restaurantId,
    });

    const reservedTables = existingReservations.filter(
      (reservation) =>
        reservation.date === createDTO.date &&
        reservation.time === createDTO.time &&
        reservation.status === "active"
    ).length;

    if (reservedTables >= restaurant.capacity) {
      throw new ValidationError(
        "Restaurant is fully booked for this time slot"
      );
    }

    createDTO.status = "active";

    try {
      const reservation = await reservationRepository.create(createDTO);

      return reservationDTO.reservationOutputDTO(reservation);
    } catch (err) {
      if (err.name === "SequelizeValidationError") {
        throw ValidationError.fromSequelize(err);
      }
      throw err;
    }
  },

  async updateReservation(id, data, customer) {
    if (customer.role !== "customer")
      throw new ForbiddenError("Only customers can update reservations");

    const existing = await reservationRepository.findById(id);
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

    if (updateDTO.date || updateDTO.time) {
      dateTimeUtils.validateReservationDateTime(
        updateDTO.date ?? existing.date,
        updateDTO.time ?? existing.time
      );
    }

    if ("customerId" in updateDTO || "restaurantId" in updateDTO) {
      throw new ValidationError("Cannot modify reservation ownership");
    }

    try {
      const updated = await reservationRepository.update(id, updateDTO);
      return reservationDTO.reservationOutputDTO(updated);
    } catch (err) {
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
