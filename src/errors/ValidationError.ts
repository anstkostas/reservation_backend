import { Prisma } from "../generated/prisma/index.js";
import { HTTP_STATUS, RESPONSE_MESSAGES, ErrorCode, ERROR_CODES } from "../constants/index.js";

/** A single field-level validation failure returned in the error response. */
export interface ValidationDetail {
  field: string;
  message: string;
  /** Zod issue code (e.g. too_small, invalid_type) or a custom code — open string set. */
  code?: string;
}

/**
 * Thrown when request input fails validation or a business rule is violated.
 * Maps to HTTP 400 Bad Request. Carries an optional array of field-level details
 * ({ field, message }) that the frontend maps directly to form field errors.
 */
export class ValidationError extends Error {
  statusCode: number;
  details: ValidationDetail[];
  code?: ErrorCode;

  constructor(
    message: string = RESPONSE_MESSAGES.BAD_REQUEST,
    details: ValidationDetail[] = [],
    code?: ErrorCode
  ) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = HTTP_STATUS.BAD_REQUEST;
    this.details = details;
    this.code = code;
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
      // No field-level details — surfaces as a root-level message on the frontend
      return new ValidationError(`${fields} already in use`, [], ERROR_CODES.RESOURCE_CONFLICT);
    }
    return new ValidationError('An unexpected error occurred.', [], ERROR_CODES.INTERNAL_ERROR);
  }
}
