const { HTTP_STATUS, RESPONSE_MESSAGES } = require("../constants");

class ForbiddenError extends Error {
  constructor(message = RESPONSE_MESSAGES.AUTH.FORBIDDEN) {
    super(message);
    this.name = "ForbiddenError";
    this.statusCode = HTTP_STATUS.FORBIDDEN;
  }
}

module.exports = ForbiddenError;
