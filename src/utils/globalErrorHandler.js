const { ENV } = require("../config/env.js");
const {
  ValidationError,
  ForbiddenError,
  NotFoundError,
  NotAuthenticatedError,
} = require("../errors");

module.exports = (err, req, res, next) => {
  console.error(err);

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
};
