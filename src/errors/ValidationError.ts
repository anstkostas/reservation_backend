import { Prisma } from "../generated/prisma/client.js";
import { HTTP_STATUS, RESPONSE_MESSAGES } from "../constants/index.js";

/**
 * Thrown when request input fails validation or a business rule is violated.
 * Maps to HTTP 400 Bad Request. Carries an optional array of field-level detail messages.
 */
export class ValidationError extends Error {
  statusCode: number;
  details: string[];

  constructor(message: string = RESPONSE_MESSAGES.BAD_REQUEST, details: string[] = []) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = HTTP_STATUS.BAD_REQUEST;
    this.details = details;
  }

  /**
   * Creates a ValidationError from a Prisma known request error.
   * Handles common constraint violations with human-readable detail messages.
   *
   * @param {Prisma.PrismaClientKnownRequestError} err - The Prisma error
   * @returns {ValidationError}
   */
  static fromPrisma(err: Prisma.PrismaClientKnownRequestError): ValidationError {
    // P2002 = unique constraint violation — surface which field(s) conflicted
    if (err.code === "P2002" && err.meta?.target) {
      const fields = Array.isArray(err.meta.target)
        ? err.meta.target.join(", ")
        : String(err.meta.target);
      return new ValidationError("Validation failed", [`${fields} already exists`]);
    }
    return new ValidationError(err.message || "Validation failed");
  }
}
