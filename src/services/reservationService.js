const reservationRepository = require("../repositories/reservationRepository.js");
const restaurantRepository = require("../repositories/restaurantRepository.js");
const reservationDTO = require("../dtos/reservationDTO.js");
const { isInPast, isWithinTwoMonths } = require("../utils/dateTimeUtils.js");

module.exports = {
  async createReservation(restaurantId, data, customer) {
    if (customer.role !== "customer")
      throw new Error("Only customers can make reservations");

    const createDTO = reservationDTO.createReservationInputDTO(data);

    if (isInPast(createDTO.date)) {
      throw new Error("Reservation date cannot be in the past");
    }

    if (!isWithinTwoMonths(reservationDate)) {
      throw new Error("Reservation must be within 2 months from today");
    }

    if (createDTO.persons < 1) {
      throw new Error("Persons must be at least 1");
    }

    if (!restaurantId) throw new Error("RestaurantId required");
    createDTO.restaurantId = restaurantId;
    createDTO.customerId = user.id;

    const restaurant = await restaurantRepository.findById(restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    if (createDTO.persons > restaurant.capacity) {
      throw new Error("Persons exceed restaurant capacity");
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
      throw new Error("Restaurant is fully booked for this time slot");
    }

    createDTO.status = "active";
    const reservation = await reservationRepository.create(createDTO);

    return reservationDTO.reservationOutputDTO(reservation);
  },

  async updateReservation(id, data, customer) {
    if (customer.role !== "customer")
      throw new Error("Only customers can update reservations");

    const existing = await reservationRepository.findById(id);
    if (!existing) {
      throw new Error("Reservation not found");
    }

    if (existing.customerId !== customer.id) {
      throw new Error("Not allowed to modify this reservation");
    }

    if (existing.status !== "active") {
      throw new Error("Only active reservations can be modified");
    }

    if (isInPast(createDTO.date)) {
      throw new Error("Past reservations cannot be modified");
    }

    const updateDTO = reservationDTO.updateReservationInputDTO(data);
    if ("customerId" in updateDTO || "restaurantId" in updateDTO) {
      throw new Error("Cannot modify reservation ownership");
    }

    if (updateDTO.persons !== undefined && updateDTO.persons < 1) {
      throw new Error("Persons must be at least 1");
    }

    const updated = await reservationRepository.update(id, updateDTO);
    return reservationDTO.reservationOutputDTO(updated);
  },

  // soft-delete
  async cancelReservation(id, customer) {
    const reservation = await reservationRepository.findById(id);
    if (!reservation) {
      throw new Error("Reservation not found");
    }

    if (reservation.customerId !== customer.id) {
      throw new Error("Cannot cancel another customer's reservation");
    }

    if (reservation.status !== "active") {
      throw new Error("Only active reservations can be canceled");
    }

    // Instead of hard-delete change status to "canceled".
    const updated = await reservationRepository.update(id, {
      status: "canceled",
    });

    return reservationDTO.reservationOutputDTO(updated);
  },

  async completeReservation(id, user) {
    if (user.role !== "owner") {
      throw new Error("Only owners can complete reservations");
    }

    const restaurant = await restaurantRepository.findByOwnerId(user.id);
    if (!restaurant) throw new Error("Owner has no assigned restaurant");

    const reservation = await reservationRepository.findById(id);
    if (!reservation) throw new Error("Reservation not found");

    if (reservation.restaurantId !== restaurant.id) {
      throw new Error("Cannot complete reservation for another restaurant");
    }

    if (reservation.status !== "active") {
      throw new Error("Only active reservations can be completed");
    }

    // Update status
    const updated = await reservationRepository.update(id, {
      status: "completed",
    });

    return reservationDTO.reservationOutputDTO(updated);
  },

  async listActiveReservationOfOwner(user) {
    if (user.role === "customer") {
      throw new Error("This id belongs to a customer not an owner");
    }

    const restaurant = await restaurantRepository.findByOwnerId(user.id);
    if (!restaurant) throw new Error("Owner has no assigned restaurant");

    const reservations = [];
    const resList = await reservationRepository.findAll({
      restaurantId: restaurant.id,
    });
    reservations.push(...resList.filter((r) => r.status === "active"));
    // return reservations.map((reservation) =>
    //   reservationDTO.reservationOutputDTO(reservation)
    // );
    return reservations.map(reservationDTO.reservationOutputDTO); // A more consice way!
  },
};
