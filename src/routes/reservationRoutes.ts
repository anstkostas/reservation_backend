import express from "express";
import { Role } from "../generated/prisma/client.js";
import { reservationController } from "../controllers/index.js";
import { requireAuth, requireRole, validate } from "../middlewares/index.js";
import {
  createReservationSchema,
  updateReservationSchema,
  reservationStatusSchema,
  idParamSchema,
  restaurantIdParamSchema,
} from "../validation/index.js";

const router = express.Router();

/* Customer routes */

/**
 * @swagger
 * /reservations/restaurants/{restaurantId}:
 *   post:
 *     summary: Create a new reservation
 *     description: Creates a reservation for a given restaurant. Only users with the "customer" role can create reservations.
 *     tags:
 *       - Reservations
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the restaurant for the reservation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReservationInput'
 *     responses:
 *       201:
 *         description: Reservation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Reservation created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Validation error (invalid date/time, overcapacity, overbooking)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized (missing/invalid/expired JWT)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden (user does not have "customer" role)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/restaurants/:restaurantId",
  requireAuth,
  requireRole(Role.customer),
  validate(restaurantIdParamSchema, "params"),
  validate(createReservationSchema),
  reservationController.createReservation
);

/**
 * @swagger
 * /reservations/my-reservations:
 *   get:
 *     summary: List all reservations for the authenticated customer
 *     description: Retrieves all reservations (active, canceled, completed, no-show) for the authenticated customer.
 *     tags:
 *       - Reservations
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Reservations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reservation'
 *       401:
 *         description: Unauthorized (missing/invalid JWT)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden (user is not a customer)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/my-reservations",
  requireAuth,
  requireRole(Role.customer),
  reservationController.listCustomerReservations
);

/**
 * @swagger
 * /reservations/{id}:
 *   put:
 *     summary: Update an existing reservation
 *     description: Updates the date, time, or number of persons for an active reservation. Only the customer who owns the reservation can modify it.
 *     tags:
 *       - Reservations
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the reservation to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateReservationInput'
 *     responses:
 *       200:
 *         description: Reservation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Validation error (invalid input, overbooking, wrong status)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized (missing/invalid/expired JWT)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden (wrong role or modifying another user's reservation)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Reservation or restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put(
  "/:id",
  requireAuth,
  requireRole(Role.customer),
  validate(idParamSchema, "params"),
  validate(updateReservationSchema),
  reservationController.updateReservation
);

/**
 * @swagger
 * /reservations/{id}:
 *   delete:
 *     summary: Cancel an active reservation
 *     description: Cancels a reservation by setting its status to "canceled". Only the customer who created the reservation can cancel it. Only active reservations can be canceled.
 *     tags:
 *       - Reservations
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the reservation to cancel
 *     responses:
 *       200:
 *         description: Reservation canceled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Reservation is not active
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized (missing/invalid/expired JWT)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden (attempting to cancel another customer's reservation)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Reservation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole(Role.customer),
  validate(idParamSchema, "params"),
  reservationController.cancelReservation
);

/* Owner routes */

/**
 * @swagger
 * /reservations/{id}/resolve:
 *   post:
 *     summary: Mark a reservation as completed or no-show
 *     description: Allows an owner to mark an active reservation as "completed" or "no-show". Only the owner of the restaurant associated with the reservation can perform this action.
 *     tags:
 *       - Reservations
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the reservation to resolve
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [completed, no-show]
 *     responses:
 *       200:
 *         description: Reservation resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Reservation is not active or owner has no restaurant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized (missing/invalid JWT)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden (not an owner, or reservation belongs to another restaurant)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Reservation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/:id/resolve",
  requireAuth,
  requireRole(Role.owner),
  validate(idParamSchema, "params"),
  validate(reservationStatusSchema),
  reservationController.resolveReservation
);

/**
 * @swagger
 * /reservations/owner-reservations:
 *   get:
 *     summary: List all reservations for the owner's restaurant
 *     description: Retrieves all reservations for the restaurant owned by the authenticated user. Only owners can access this endpoint.
 *     tags:
 *       - Reservations
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Reservations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reservation'
 *       401:
 *         description: Unauthorized (missing/invalid JWT)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden (user is not an owner)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Owner has no assigned restaurant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/owner-reservations",
  requireAuth,
  requireRole(Role.owner),
  reservationController.listOwnerReservations
);

export default router;
