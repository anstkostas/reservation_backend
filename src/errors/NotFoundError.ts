import { HTTP_STATUS, RESPONSE_MESSAGES } from "../constants/index.js";

export class NotFoundError extends Error {
  statusCode: number;

  constructor(message: string = RESPONSE_MESSAGES.NOT_FOUND) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = HTTP_STATUS.NOT_FOUND;
  }
}
