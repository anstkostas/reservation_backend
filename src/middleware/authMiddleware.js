const jwt = require("jsonwebtoken");
const { ValidationError } = require("../errors");
const { AUTH_LOGIN } = require("../config/env");

module.exports = {
  authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(
        new ValidationError("Missing or invalid authorization header")
      );
    }

    const token = authHeader.split(" ")[1];

    try {
      const payload = jwt.verify(token, AUTH_LOGIN.JWT_SECRET);
      req.user = { id: payload.id, role: payload.role };
      next();
    } catch (err) {
      next(new ValidationError("Invalid or expired token"));
    }
  },
};
