import { HTTP_STATUS, RESPONSE_MESSAGES } from "../constants/index.js";

export class ForbiddenError extends Error {
  statusCode: number;

  constructor(message: string = RESPONSE_MESSAGES.AUTH.FORBIDDEN) {
    super(message);
    this.name = "ForbiddenError";
    this.statusCode = HTTP_STATUS.FORBIDDEN;
  }
}
