import { Request, Response, NextFunction } from "express";
import { reservationService } from "../services/index.js";
import { sendResponse } from "../utils/index.js";
import { HTTP_STATUS, RESPONSE_MESSAGES } from "../constants/index.js";
import type {
  CreateReservationInput,
  UpdateReservationInput,
  ReservationStatusInput,
} from "../validation/index.js";

// req.user is guaranteed by requireAuth middleware on all reservation routes
export const reservationController = {
  /**
   * Creates a new reservation for the authenticated customer at the specified restaurant.
   */
  async createReservation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params as { restaurantId: string };
      const reservation = await reservationService.createReservation(
        restaurantId,
        req.body as CreateReservationInput,
        req.user!
      );
      sendResponse(res, reservation, HTTP_STATUS.CREATED, RESPONSE_MESSAGES.RESERVATION.CREATED);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Updates an existing reservation's date, time, or party size.
   */
  async updateReservation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const updatedReservation = await reservationService.updateReservation(
        id,
        req.body as UpdateReservationInput,
        req.user!
      );
      sendResponse(res, updatedReservation, HTTP_STATUS.OK, RESPONSE_MESSAGES.RESERVATION.UPDATED);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Soft-cancels a reservation by setting its status to "canceled".
   */
  async cancelReservation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const canceledReservation = await reservationService.cancelReservation(id, req.user!);
      sendResponse(res, canceledReservation, HTTP_STATUS.OK, RESPONSE_MESSAGES.RESERVATION.CANCELED);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Resolves a reservation as "completed" or "no-show". Owner only.
   */
  async resolveReservation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const { status } = req.body as ReservationStatusInput;
      const resolvedReservation = await reservationService.resolveReservation(id, status, req.user!);
      const message =
        status === "completed"
          ? RESPONSE_MESSAGES.RESERVATION.COMPLETED
          : RESPONSE_MESSAGES.RESERVATION.NO_SHOW;
      sendResponse(res, resolvedReservation, HTTP_STATUS.OK, message);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Lists all reservations for the authenticated owner's restaurant.
   */
  async listOwnerReservations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reservations = await reservationService.listOwnerReservations(req.user!);
      sendResponse(res, reservations, HTTP_STATUS.OK, RESPONSE_MESSAGES.RESERVATION.RETRIEVED);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Lists all reservations belonging to the authenticated customer.
   */
  async listCustomerReservations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reservations = await reservationService.listCustomerReservations(req.user!);
      sendResponse(res, reservations, HTTP_STATUS.OK, RESPONSE_MESSAGES.RESERVATION.RETRIEVED);
    } catch (err) {
      next(err);
    }
  },
};
