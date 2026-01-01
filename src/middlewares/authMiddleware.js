const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { NotAuthenticatedError } = require("../errors");
const { AUTH_CONFIG } = require("../config/env.js");
const { userDTO } = require("../dtos");

module.exports = {
  /**
   * Middleware to ensure the user is authenticated.
   */
  async requireAuth(req, res, next) {
    try {
      const token = req.cookies?.accessToken;
      if (!token) {
        return next(new NotAuthenticatedError());
      }

      const payload = jwt.verify(token, AUTH_CONFIG.JWT_SECRET);

      const user = await User.findByPk(payload.sub);

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
