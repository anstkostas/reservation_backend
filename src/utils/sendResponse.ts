import { Response } from "express";
import { RESPONSE_MESSAGES } from "../constants/index.js";

/**
 * Sends a standardised success JSON response.
 *
 * @param {Response} res - Express response object
 * @param {unknown} data - Response payload
 * @param {number} status - HTTP status code (default: 200)
 * @param {string | null} message - Optional human-readable message; falls back to RESPONSE_MESSAGES.SUCCESS
 * @returns {void}
 */
export function sendResponse(
  res: Response,
  data: unknown,
  status: number = 200,
  message: string | null = null
): void {
  const payload: { success: boolean; data: unknown; message: string } = {
    success: true,
    data,
    message: message ?? RESPONSE_MESSAGES.SUCCESS,
  };
  res.status(status).json(payload);
}
