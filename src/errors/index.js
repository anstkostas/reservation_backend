const NotFoundError = require("./NotFoundError");
const ValidationError = require("./ValidationError.js");
const ForbiddenError = require("./ForbiddenError.js");
const NotAuthenticatedError = require("./NotAuthenticatedError.js");

module.exports = {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  NotAuthenticatedError,
};
