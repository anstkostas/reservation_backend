const { HTTP_STATUS, RESPONSE_MESSAGES } = require("../constants");

class NotFoundError extends Error {
  constructor(message = RESPONSE_MESSAGES.NOT_FOUND) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = HTTP_STATUS.NOT_FOUND;
  }
}

module.exports = NotFoundError;
