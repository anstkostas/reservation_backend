const { ENV } = require("../config/env.js");
const {
  ValidationError,
  ForbiddenError,
  NotFoundError,
  NotAuthenticatedError,
} = require("../errors");

module.exports = {
  /**
   * Central Express error handler. Catches all errors bubbled via next(err) and
   * returns a consistent JSON error response. Stack trace included in development only.
   *
   * @param {Error} err - The error object
   * @param {import('express').Request} req - Express request
   * @param {import('express').Response} res - Express response
   * @param {import('express').NextFunction} next - Express next function (required by Express to identify 4-arg error handlers)
   */
  globalErrorHandler(err, _req, res, _next) {
    console.error("Global error handler logs: ", err);

    let statusCode = 500;
    let message = "Internal Server Error";
    let details;

    if (
      err instanceof ValidationError ||
      err instanceof ForbiddenError ||
      err instanceof NotFoundError ||
      err instanceof NotAuthenticatedError
    ) {
      statusCode = err.statusCode || 400;
      message = err.message || "Error occurred";
      details = err.details;
    }

    return res.status(statusCode).json({
      success: false,
      message,
      ...(details && { details }),
      ...(ENV === "development" && { stack: err.stack }),
    });
  },
};
