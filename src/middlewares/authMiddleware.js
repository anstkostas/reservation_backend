const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { NotAuthenticatedError } = require("../errors");
const { AUTH_CONFIG, COOKIE_CONFIG } = require("../config/env.js");
const { userDTO } = require("../dtos");

module.exports = {
  /**
   * Middleware to ensure the user is authenticated.
   * Reads the JWT from the configured httpOnly cookie, verifies it, and attaches
   * the sanitized user object to req.user for downstream handlers.
   *
   * @throws {NotAuthenticatedError} If cookie parser is missing, token is absent/invalid/expired, or user no longer exists
   */
  async requireAuth(req, _res, next) {
    if (req.method === "OPTIONS") return next(); // allow CORS preflight requests through without auth

    try {
      if (req.cookies === undefined) {
        return next(new NotAuthenticatedError("Cookie parser middleware not configured"));
      }
      const token = req.cookies[COOKIE_CONFIG.NAME]; // use env-configured name, not hardcoded string

      if (!token) {
        return next(new NotAuthenticatedError("No authentication token provided"));
      }

      const payload = jwt.verify(token, AUTH_CONFIG.JWT_SECRET);
      const user = await User.findByPk(payload.id);

      if (!user) {
        return next(new NotAuthenticatedError("User not found"));
      }

      req.user = userDTO.userOutputDTO(user);

      next();
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(new NotAuthenticatedError("Token expired"));
      }
      if (err.name === "JsonWebTokenError") {
        return next(new NotAuthenticatedError("Invalid token"));
      }

      next(err);
    }
  },
};
