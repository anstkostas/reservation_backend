import { Request, Response, NextFunction } from "express";
import { Prisma } from "../generated/prisma/index.js";
import { ENV } from "../config/env.js";
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
  NotAuthenticatedError,
} from "../errors/index.js";

/**
 * Central Express error handler. Catches all errors bubbled via next(err) and
 * returns a consistent JSON error response. Stack trace included in development only.
 *
 * @param {Error} err - The error object
 * @param {Request} _req - Express request (unused)
 * @param {Response} res - Express response
 * @param {NextFunction} _next - Required by Express to identify 4-arg error handlers
 */
export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // _next must be declared even if unused — Express identifies error handlers by arity (4 args)
  _next: NextFunction
): void {
  console.error("[LOG] globalErrorHandler:", err);

  let statusCode = 500;
  let message = "Internal Server Error";
  let details: string[] | undefined;

  if (
    err instanceof ValidationError ||
    err instanceof ForbiddenError ||
    err instanceof NotFoundError ||
    err instanceof NotAuthenticatedError
  ) {
    statusCode = err.statusCode;
    message = err.message;
    // details only exists on ValidationError
    details = err instanceof ValidationError ? err.details : undefined;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Safety net — Prisma constraint errors that were not caught in services
    // (e.g. P2002 unique violation). fromPrisma() maps known codes to readable messages.
    const converted = ValidationError.fromPrisma(err);
    statusCode = converted.statusCode;
    message = converted.message;
    details = converted.details;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details && { details }),
    ...(ENV === "development" && { stack: err.stack }),
  });
}
