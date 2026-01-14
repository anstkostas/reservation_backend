const { reservationService } = require("../services");
const { sendResponse } = require("../utils/");

// NOTE req.user comes from auth middleware.
module.exports = {
  async createReservation(req, res, next) {
    try {
      const { restaurantId } = req.params;
      const reservation = await reservationService.createReservation(
        restaurantId,
        req.body,
        req.user
      );
      return sendResponse(res, reservation, 201, "Reservation created successfully");
    } catch (err) {
      next(err);
    }
  },

  async updateReservation(req, res, next) {
    try {
      const reservationId = req.params.id;
      const updatedReservation = await reservationService.updateReservation(
        reservationId,
        req.body,
        req.user
      );
      return sendResponse(res, updatedReservation, 200, "Reservation updated successfully");
    } catch (err) {
      next(err);
    }
  },

  async cancelReservation(req, res, next) {
    try {
      const { id } = req.params;
      const canceledReservation = await reservationService.cancelReservation(
        id,
        req.user
      );
      return sendResponse(res, canceledReservation, 200, "Reservation canceled successfully");
    } catch (err) {
      next(err);
    }
  },

  async resolveReservation(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const resolvedReservation = await reservationService.resolveReservation(
        id,
        status,
        req.user
      );
      const message = status === 'completed'
        ? "Reservation successfully updated as completed"
        : "Reservation successfully updated as no-show";
      return sendResponse(res, resolvedReservation, 200, message);
    } catch (err) {
      next(err);
    }
  },

  async listOwnerReservations(req, res, next) {
    try {
      const reservations =
        await reservationService.listOwnerReservations(req.user);
      return sendResponse(res, reservations);
    } catch (err) {
      next(err);
    }
  },

  async listCustomerReservations(req, res, next) {
    try {
      const reservations = await reservationService.listCustomerReservations(
        req.user
      );
      return sendResponse(res, reservations);
    } catch (err) {
      next(err);
    }
  },
};
