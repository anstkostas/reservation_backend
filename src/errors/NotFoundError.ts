import { HTTP_STATUS, RESPONSE_MESSAGES } from "../constants/index.js";

/**
 * Thrown when a requested resource does not exist in the database.
 * Maps to HTTP 404 Not Found.
 */
export class NotFoundError extends Error {
  statusCode: number;

  constructor(message: string = RESPONSE_MESSAGES.NOT_FOUND) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = HTTP_STATUS.NOT_FOUND;
  }
}
