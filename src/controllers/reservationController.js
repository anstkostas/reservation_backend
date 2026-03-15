const { reservationService } = require("../services");
const { sendResponse } = require("../utils/");
const { HTTP_STATUS, RESPONSE_MESSAGES, RESERVATION_STATUS } = require("../constants");

// NOTE req.user is populated by requireAuth middleware on all reservation routes.
module.exports = {
  /**
   * Creates a new reservation for the authenticated customer at the specified restaurant.
   *
   * @async
   * @throws {ForbiddenError} If the authenticated user is not a customer
   * @throws {NotFoundError} If the restaurant does not exist
   * @throws {ValidationError} If the time slot is unavailable or the date is out of range
   */
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

  /**
   * Updates an existing reservation's date, time, or party size.
   *
   * @async
   * @throws {NotFoundError} If the reservation does not exist
   * @throws {ForbiddenError} If the reservation does not belong to the authenticated customer
   * @throws {ValidationError} If the updated slot is unavailable
   */
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

  /**
   * Soft-cancels a reservation by setting its status to "canceled".
   *
   * @async
   * @throws {NotFoundError} If the reservation does not exist
   * @throws {ForbiddenError} If the reservation does not belong to the authenticated customer
   * @throws {ValidationError} If the reservation is already canceled
   */
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

  /**
   * Resolves a reservation as "completed" or "no-show". Owner only.
   *
   * @async
   * @throws {NotFoundError} If the reservation does not exist
   * @throws {ForbiddenError} If the authenticated user is not the restaurant owner
   */
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

  /**
   * Lists all reservations for the authenticated owner's restaurant.
   *
   * @async
   * @throws {ForbiddenError} If the authenticated user is not an owner
   */
  async listOwnerReservations(req, res, next) {
    try {
      const reservations =
        await reservationService.listOwnerReservations(req.user);
      return sendResponse(res, reservations, HTTP_STATUS.OK, RESPONSE_MESSAGES.RESERVATION.RETRIEVED);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Lists all reservations belonging to the authenticated customer.
   *
   * @async
   * @throws {ForbiddenError} If the authenticated user is not a customer
   */
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
