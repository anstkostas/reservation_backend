import { HTTP_STATUS, RESPONSE_MESSAGES } from "../constants/index.js";

export class NotAuthenticatedError extends Error {
  statusCode: number;

  constructor(message: string = RESPONSE_MESSAGES.AUTH.NOT_AUTHENTICATED) {
    super(message);
    this.name = "NotAuthenticatedError";
    this.statusCode = HTTP_STATUS.NOT_AUTHENTICATED;
  }
}
