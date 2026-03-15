const { requireAuth } = require("./authMiddleware.js");
const { requireRole } = require("./roleMiddleware.js");
const { validate } = require("./validate.js");
const { globalErrorHandler } = require("./globalErrorHandler.js");

module.exports = {
  requireAuth,
  requireRole,
  validate,
  globalErrorHandler,
};
