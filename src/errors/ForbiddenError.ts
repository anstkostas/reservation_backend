import { HTTP_STATUS, RESPONSE_MESSAGES, ErrorCode } from "@/constants/index.js";

/**
 * Thrown when an authenticated user attempts an action they are not permitted to perform.
 * Maps to HTTP 403 Forbidden.
 */
export class ForbiddenError extends Error {
  statusCode: number;
  code?: ErrorCode;

  constructor(message: string = RESPONSE_MESSAGES.AUTH.FORBIDDEN, code?: ErrorCode) {
    super(message);
    this.name = "ForbiddenError";
    this.statusCode = HTTP_STATUS.FORBIDDEN;
    this.code = code;
  }
}
