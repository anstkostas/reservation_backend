const { ForbiddenError } = require("../errors");

/**
 * Middleware to enforce role-based access control.
 *
 * Attaches a closure that checks if `req.user.role` is included
 * in the list of allowed roles. Throws a ForbiddenError if not.
 *
 * @param {...string} allowedRoles - One or more roles allowed to access the route.
 * @returns {import('express').RequestHandler} Express middleware function.
 *
 * @example
 * const { authorizeRoles } = require('./roleMiddleware');
 *
 * // Only customers can access this route
 * router.post('/reservations', authenticate, authorizeRoles('customer'), createReservation);
 *
 * // Customers or owners can access this route
 * router.get('/dashboard', authenticate, authorizeRoles('customer', 'owner'), getDashboard);
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return next(
        new ForbiddenError("You do not have permission to access this resource")
      );
    }
    next();
  };
}

module.exports = { authorizeRoles };
