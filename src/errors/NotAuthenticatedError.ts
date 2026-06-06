import { HTTP_STATUS, RESPONSE_MESSAGES, ErrorCode } from "@/constants/index.js";

/**
 * Thrown when a request arrives without valid authentication credentials.
 * Maps to HTTP 401 Unauthorized.
 */
export class NotAuthenticatedError extends Error {
  statusCode: number;
  code?: ErrorCode;

  constructor(message: string = RESPONSE_MESSAGES.AUTH.NOT_AUTHENTICATED, code?: ErrorCode) {
    super(message);
    this.name = "NotAuthenticatedError";
    this.statusCode = HTTP_STATUS.NOT_AUTHENTICATED;
    this.code = code;
  }
}
