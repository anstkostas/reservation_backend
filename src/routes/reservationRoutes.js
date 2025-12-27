const express = require("express");
const { reservationController } = require("../controllers");
const { requireAuth, requireRole } = require("../middlewares");

const router = express.Router();

// Customer routes
router.post(
  "/restaurants/:restaurantId/reservations",
  requireAuth,
  requireRole("customer"),
  reservationController.createReservation
);
router.put(
  "/reservations/:id",
  requireAuth,
  requireRole("customer"),
  reservationController.updateReservation
);
router.delete(
  "/reservations/:id",
  requireAuth,
  requireRole("customer"),
  reservationController.cancelReservation
);

// Owner routes
router.post(
  "/reservations/:id/complete",
  requireAuth,
  requireRole("owner"),
  reservationController.completeReservation
);
router.get(
  "/owner/reservations",
  requireAuth,
  requireRole("owner"),
  reservationController.listActiveReservationsOfOwner
);

module.exports = router;
