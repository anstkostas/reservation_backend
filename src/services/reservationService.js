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

    if (createDTO.date && dateTimeUtils.isInPast(createDTO.date)) {
      throw new ValidationError("Reservation date cannot be in the past");
    }

    if (createDTO.date && !dateTimeUtils.isWithinTwoMonths(createDTO.date)) {
      throw new ValidationError(
        "Reservation must be within 2 months from today"
      );
    }

    if (createDTO.persons < 1) {
      throw new ValidationError("Persons must be at least 1");
    }

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
    const existingReservations = await reservationRepository.findAll({
      restaurantId,
    });

    const sameSlot = existingReservations.filter(
      (reservation) =>
        reservation.date === createDTO.date &&
        reservation.time === createDTO.time &&
        reservation.status === "active"
    );

    const reservedTables = sameSlot.reduce(
      (sum, reservation) => sum + reservation.persons,
      0
    );

    if (reservedTables + createDTO.persons > restaurant.capacity) {
      throw new ValidationError(
        "Restaurant is fully booked for this time slot"
      );
    }

    createDTO.status = "active";
    const reservation = await reservationRepository.create(createDTO);

    return reservationDTO.reservationOutputDTO(reservation);
  },

  async updateReservation(id, data, customer) {
    if (customer.role !== "customer")
      throw new ForbiddenError("Only customers can update reservations");

    const existing = await reservationRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Reservation not found");
    }

    if (existing.customerId !== customer.id) {
      throw new ForbiddenError("Not allowed to modify another person's reservation");
    }

    if (existing.status !== "active") {
      throw new ValidationError("Only active reservations can be modified");
    }

    const updateDTO = reservationDTO.updateReservationInputDTO(data);
    if (updateDTO.date && dateTimeUtils.isInPast(updateDTO.date)) {
      throw new ValidationError("Past reservations cannot be modified");
    }

    if ("customerId" in updateDTO || "restaurantId" in updateDTO) {
      throw new ValidationError("Cannot modify reservation ownership");
    }

    if (updateDTO.persons !== undefined && updateDTO.persons < 1) {
      throw new ValidationError("Persons must be at least 1");
    }

    const updated = await reservationRepository.update(id, updateDTO);
    return reservationDTO.reservationOutputDTO(updated);
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
    if (!restaurant) throw new ValidationError("Owner has no assigned restaurant");

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
    if (!restaurant) throw new ValidationError("Owner has no assigned restaurant");

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
