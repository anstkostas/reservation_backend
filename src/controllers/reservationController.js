const { reservationService } = require("../services");
const { sendResponse } = require("../utils/");
const { HTTP_STATUS, RESPONSE_MESSAGES, RESERVATION_STATUS } = require("../constants");

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
      return sendResponse(res, reservation, HTTP_STATUS.CREATED, RESPONSE_MESSAGES.RESERVATION.CREATED);
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
      return sendResponse(res, updatedReservation, HTTP_STATUS.OK, RESPONSE_MESSAGES.RESERVATION.UPDATED);
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
      return sendResponse(res, canceledReservation, HTTP_STATUS.OK, RESPONSE_MESSAGES.RESERVATION.CANCELED);
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
      const message = status === RESERVATION_STATUS.COMPLETED
        ? RESPONSE_MESSAGES.RESERVATION.COMPLETED
        : RESPONSE_MESSAGES.RESERVATION.NO_SHOW;
      return sendResponse(res, resolvedReservation, HTTP_STATUS.OK, message);
    } catch (err) {
      next(err);
    }
  },

  async listOwnerReservations(req, res, next) {
    try {
      const reservations =
        await reservationService.listOwnerReservations(req.user);
      // Use explicit status and message for consistency
      return sendResponse(res, reservations, HTTP_STATUS.OK, RESPONSE_MESSAGES.RESERVATION.RETRIEVED);
    } catch (err) {
      next(err);
    }
  },

  async listCustomerReservations(req, res, next) {
    try {
      const reservations = await reservationService.listCustomerReservations(
        req.user
      );
      return sendResponse(res, reservations, HTTP_STATUS.OK, RESPONSE_MESSAGES.RESERVATION.RETRIEVED);
    } catch (err) {
      next(err);
    }
  },
};
