const { ForbiddenError } = require("../errors");

module.exports = {
  /**
   * Responsibility
   * Enforce role-based access only
   * Guarantees
   * Request proceeds only if role matches.
   * Attaches a closure that checks if `req.user.role` is included.
   * Throws a ForbiddenError if not.
   * @param {"customer" | "owner"} requiredRole
   * @returns {Function} Express middleware
   *
   * @throws {ForbiddenError} if user role does not match
   *
   * @example
   * router.post("/path", requireAuth, requireRole("owner"), handler)
   */
  requireRole(requiredRole) {
    return function roleMiddleware(req, res, next) {
      if (!req.user || req.user.role !== requiredRole) {
        return next(
          new ForbiddenError(
            "You do not have permission to access this resource"
          )
        );
      }
      next();
    };
  },
};
