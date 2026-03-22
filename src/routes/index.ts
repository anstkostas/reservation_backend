import express, { type Application } from "express";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import restaurantRoutes from "./restaurantRoutes.js";
import reservationRoutes from "./reservationRoutes.js";

export function registerRoutes(app: Application): void {
  const router = express.Router();
  router.use("/auth", authRoutes);
  router.use("/users", userRoutes);
  router.use("/restaurants", restaurantRoutes);
  router.use("/reservations", reservationRoutes);
  app.use("/api", router);
}
