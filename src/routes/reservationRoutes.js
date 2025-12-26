const express = require("express");
const { reservationController } = require("../controllers");
const { requireAuth } = require("../middleware");
const { requireRole } = require("../middleware");

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
  middlewares.requireAuth,
  middlewares.requireRole("owner"),
  reservationController.completeReservation
);
router.get(
  "/owner/reservations",
  middlewares.requireAuth,
  middlewares.requireRole("owner"),
  reservationController.listActiveReservationsOfOwner
);

module.exports = router;
