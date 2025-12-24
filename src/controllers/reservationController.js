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
      return sendResponse(res, reservation, 201);
    } catch (err) {
      next(err);
    }
  },

  async updateReservation(req, res, next) {
    try {
      const reservationId = Number(req.params.id);
      const updatedReservation = await reservationService.updateReservation(
        reservationId,
        req.body,
        req.user
      );
      return sendResponse(res, updatedReservation);
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
      return sendResponse(res, canceledReservation);
    } catch (err) {
      next(err);
    }
  },

  async completeReservation(req, res, next) {
    try {
      const { id } = req.params;
      const completedReservation = await reservationService.completeReservation(
        id,
        req.user
      );
      return sendResponse(res, completedReservation);
    } catch (err) {
      next(err);
    }
  },

  async listActiveReservationsOfOwner(req, res, next) {
    try {
      const reservations =
        await reservationService.listActiveReservationsOfOwner(req.user);
      return sendResponse(res, reservations);
    } catch (err) {
      next(err);
    }
  },
};
