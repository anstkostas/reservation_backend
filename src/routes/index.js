const express = require("express");

const authRoutes = require("./authRoutes.js");
const userRoutes = require("./userRoutes.js");
const reservationRoutes = require("./reservationRoutes.js");

module.exports = {
  registerRoutes(app) {
    const router = express.Router();
    router.use("/auth", authRoutes);
    router.use("/users", userRoutes);
    router.use("/reservations", reservationRoutes);
    app.use("/api", router);
  },
};
