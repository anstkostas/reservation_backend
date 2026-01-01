const express = require("express");
const { reservationController } = require("../controllers");
const { requireAuth, requireRole } = require("../middlewares");

const router = express.Router();

/* Customer routes */

/**
 * @swagger
 * /restaurants/{restaurantId}/reservations:
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
 *         description: Validation error (invalid date/time, overcapacity, overbooking, wrong role)
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
  "/restaurants/:restaurantId/reservations",
  requireAuth,
  requireRole("customer"),
  reservationController.createReservation
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
 *                 message:
 *                   type: string
 *                   example: Reservation updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Validation error (invalid input, overbooking, wrong status, ownership modification)
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
 *         description: Forbidden (wrong role or modifying another user’s reservation)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Reservation or restaurant not found
 *         conten*
 */
router.put(
  "/reservations/:id",
  requireAuth,
  requireRole("customer"),
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
 *                 message:
 *                   type: string
 *                   example: Reservation canceled successfully
 *                 data:
 *                   $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Validation error (e.g., reservation already canceled or completed)
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
  "/reservations/:id",
  requireAuth,
  requireRole("customer"),
  reservationController.cancelReservation
);

/* Owner routes */

/**
 * @swagger
 * /reservations/{id}/complete:
 *   post:
 *     summary: Mark a reservation as completed
 *     description: Allows an owner to mark an active reservation as "completed". Only the owner of the restaurant associated with the reservation can perform this action. Only active reservations can be completed.
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
 *         description: UUID of the reservation to complete
 *     responses:
 *       200:
 *         description: Reservation completed successfully
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
 *                   example: Reservation completed successfully
 *                 data:
 *                   $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Validation error (e.g., reservation not active, owner has no restaurant)
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
 *         description: Forbidden (attempting to complete a reservation for another restaurant)
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
  "/reservations/:id/complete",
  requireAuth,
  requireRole("owner"),
  reservationController.completeReservation
);

/**
 * @swagger
 * /owner/reservations:
 *   get:
 *     summary: List all active reservations for the owner's restaurant
 *     description: Retrieves all active reservations for the restaurant owned by the authenticated user. Only owners can access this endpoint.
 *     tags:
 *       - Reservations
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Active reservations retrieved successfully
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
 *                   example: Active reservations fetched
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
 *         description: Validation error (e.g., owner has no assigned restaurant)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/owner/reservations",
  requireAuth,
  requireRole("owner"),
  reservationController.listActiveReservationsOfOwner
);

module.exports = router;
