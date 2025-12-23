class NotAuthenticatedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "NotAuthenticatedError";
    this.statusCode = 401;
  }
}

module.exports = NotAuthenticatedError;
