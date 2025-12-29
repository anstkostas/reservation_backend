const jwt = require("jsonwebtoken");
const { NotAuthenticatedError } = require("../errors");
const { AUTH_CONFIG } = require("../config/env.js");

module.exports = {
  /**
   * JWT authentication middleware.
   * Verifies Bearer token and attaches { id, role } to req.user.
   *
   * @throws {NotAuthenticatedError} if token is missing or invalid
   */
  requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const [scheme, token] = authHeader?.split(" ") ?? [];
    if (scheme !== "Bearer" || !token) {
      return next(
        new NotAuthenticatedError("Missing or invalid authorization header")
      );
    }

    try {
      const payload = jwt.verify(token, AUTH_CONFIG.JWT_SECRET);
      req.user = { id: payload.id, role: payload.role };
      next();
    } catch (err) {
      next(new NotAuthenticatedError("Invalid or expired token"));
    }
  },
};
