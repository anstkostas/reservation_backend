/**
 * Unit tests for globalErrorHandler and ValidationError.fromPrisma.
 * Type: unit (req/res mocked, no network).
 * Covers: globalErrorHandler — ValidationError (statusCode + message + code present +
 *         code absent + non-empty details array); ForbiddenError (403); NotFoundError (404);
 *         NotAuthenticatedError (401); Prisma.PrismaClientKnownRequestError with P-code
 *         (fromPrisma, P2002 → 400); Prisma.PrismaClientKnownRequestError with native code
 *         (ECONNREFUSED → 503 SERVICE_UNAVAILABLE); Prisma.PrismaClientInitializationError
 *         (503 SERVICE_UNAVAILABLE); unknown error (500 INTERNAL_ERROR).
 *         ValidationError.fromPrisma — P2002 with target field; non-P2002 fallback.
 * Not yet covered: stack trace in response when ENV === "development" — requires mocking
 *         the env config module, environment-dependent.
 */

import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { Prisma } from "../../generated/prisma/index.js";
import { globalErrorHandler } from "@/middlewares/globalErrorHandler.js";
import {
  ValidationError,
  ValidationDetail,
  ForbiddenError,
  NotFoundError,
  NotAuthenticatedError,
} from "@/errors/index.js";
import { HTTP_STATUS, ERROR_CODES } from "@/constants/index.js";

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
}

describe("globalErrorHandler", () => {
  it("maps ValidationError to 400 and its message", () => {
    const err = new ValidationError("Field is invalid");
    const res = mockRes();
    globalErrorHandler(err, {} as Request, res, vi.fn() as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Field is invalid" })
    );
  });

  it("emits the code field when the custom error carries a code", () => {
    const err = new ValidationError("Slot is full", [], ERROR_CODES.RESERVATION_SLOT_FULL);
    const res = mockRes();
    globalErrorHandler(err, {} as Request, res, vi.fn() as unknown as NextFunction);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: ERROR_CODES.RESERVATION_SLOT_FULL })
    );
  });

  it("omits the code field when a custom error has no code", () => {
    const err = new ValidationError("Business rule violated"); // no code arg
    const res = mockRes();
    globalErrorHandler(err, {} as Request, res, vi.fn() as unknown as NextFunction);

    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonArg.code).toBeUndefined();
  });

  it("includes the details array in the response for ValidationError with details", () => {
    const details: ValidationDetail[] = [{ field: "email", message: "Email is required" }];
    const err = new ValidationError("Validation failed", details);
    const res = mockRes();
    globalErrorHandler(err, {} as Request, res, vi.fn() as unknown as NextFunction);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ details })
    );
  });

  it("maps ForbiddenError to 403 and its message", () => {
    const err = new ForbiddenError("Access denied");
    const res = mockRes();
    globalErrorHandler(err, {} as Request, res, vi.fn() as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Access denied" })
    );
  });

  it("maps NotFoundError to 404 and its message", () => {
    const err = new NotFoundError("Resource not found");
    const res = mockRes();
    globalErrorHandler(err, {} as Request, res, vi.fn() as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Resource not found" })
    );
  });

  it("maps NotAuthenticatedError to 401 and its message", () => {
    const err = new NotAuthenticatedError("Authentication required");
    const res = mockRes();
    globalErrorHandler(err, {} as Request, res, vi.fn() as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_AUTHENTICATED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Authentication required" })
    );
  });

  it("maps a Prisma P2002 unique constraint error to 400 via fromPrisma()", () => {
    // This branch can't be reached through the HTTP layer because services pre-empt
    // DB constraint violations at the application level. Unit test is the right tool.
    const prismaErr = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed on the fields: (`email`)",
      { code: "P2002", clientVersion: "7.0.0", meta: { target: ["email"] } }
    );
    const res = mockRes();
    globalErrorHandler(prismaErr, {} as Request, res, vi.fn() as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "email already in use",
        code: ERROR_CODES.RESOURCE_CONFLICT,
      })
    );
  });

  it("maps a PrismaClientKnownRequestError with a native code to 503", () => {
    // Native codes (e.g. ECONNREFUSED) indicate DB unreachable during a request.
    // HTTP_STATUS has no 503 constant — raw number used intentionally.
    const prismaErr = new Prisma.PrismaClientKnownRequestError(
      "Connection refused",
      { code: "ECONNREFUSED", clientVersion: "7.0.0" }
    );
    const res = mockRes();
    globalErrorHandler(prismaErr, {} as Request, res, vi.fn() as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Service temporarily unavailable. Please try again later.",
        code: ERROR_CODES.SERVICE_UNAVAILABLE,
      })
    );
  });

  it("maps a PrismaClientInitializationError to 503", () => {
    // Fired when the DB is unreachable at client initialization time.
    const prismaErr = new Prisma.PrismaClientInitializationError(
      "DB connection failed at init",
      "7.0.0"
    );
    const res = mockRes();
    globalErrorHandler(prismaErr, {} as Request, res, vi.fn() as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Service temporarily unavailable. Please try again later.",
        code: ERROR_CODES.SERVICE_UNAVAILABLE,
      })
    );
  });

  it("falls back to 500 + INTERNAL_ERROR for unexpected errors", () => {
    const err = new Error("Something exploded");
    const res = mockRes();
    globalErrorHandler(err, {} as Request, res, vi.fn() as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Internal Server Error",
        code: ERROR_CODES.INTERNAL_ERROR,
      })
    );
  });
});

describe("ValidationError.fromPrisma", () => {
  it("maps P2002 with a target field to '{field} already in use' + RESOURCE_CONFLICT code", () => {
    const err = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "7.0.0", meta: { target: ["email"] } }
    );
    const result = ValidationError.fromPrisma(err);

    expect(result.message).toBe("email already in use");
    expect(result.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(result.code).toBe(ERROR_CODES.RESOURCE_CONFLICT);
  });

  it("falls back to a generic message + INTERNAL_ERROR code for non-P2002 codes", () => {
    const err = new Prisma.PrismaClientKnownRequestError(
      "Foreign key constraint failed",
      { code: "P2003", clientVersion: "7.0.0" }
    );
    const result = ValidationError.fromPrisma(err);

    expect(result.message).toBe("An unexpected error occurred.");
    expect(result.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(result.code).toBe(ERROR_CODES.INTERNAL_ERROR);
  });
});
