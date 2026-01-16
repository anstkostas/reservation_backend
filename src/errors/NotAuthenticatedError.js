const { HTTP_STATUS, RESPONSE_MESSAGES } = require("../constants");

class NotAuthenticatedError extends Error {
  constructor(message = RESPONSE_MESSAGES.AUTH.NOT_AUTHENTICATED) {
    super(message);
    this.name = "NotAuthenticatedError";
    this.statusCode = HTTP_STATUS.NOT_AUTHENTICATED;
  }
}

module.exports = NotAuthenticatedError;
