class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
    this.details = details;
  }

  static fromSequelize(err) {
    if (err.errors && Array.isArray(err.errors)) {
      const details = err.errors.map((e) => ({
        field: e.path,
        message: e.message,
        value: e.value,
      }));
      const validationError = new ValidationError("Validation failed", details);
      validationError.stack = err.stack;
      return validationError;
    }
    return new ValidationError(err.message || "Validation failed");
  }
}

module.exports = ValidationError;
