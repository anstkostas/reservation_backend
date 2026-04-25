import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { Prisma } from "../../generated/prisma/index.js";
import { globalErrorHandler } from "../../middlewares/globalErrorHandler.js";
import { ValidationError } from "../../errors/index.js";
import { HTTP_STATUS } from "../../constants/index.js";

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
}

describe("globalErrorHandler", () => {
  it("maps custom error classes to their statusCode and message", () => {
    const err = new ValidationError("Field is invalid");
    const res = mockRes();
    globalErrorHandler(err, {} as Request, res, vi.fn() as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Field is invalid" })
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
      expect.objectContaining({ success: false, message: "email already in use" })
    );
  });

  it("falls back to 500 for unexpected errors", () => {
    const err = new Error("Something exploded");
    const res = mockRes();
    globalErrorHandler(err, {} as Request, res, vi.fn() as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Internal Server Error" })
    );
  });
});

describe("ValidationError.fromPrisma", () => {
  it("maps P2002 with a target field to '{field} already in use'", () => {
    const err = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "7.0.0", meta: { target: ["email"] } }
    );
    const result = ValidationError.fromPrisma(err);

    expect(result.message).toBe("email already in use");
    expect(result.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
  });

  it("falls back to the error message for non-P2002 codes", () => {
    const err = new Prisma.PrismaClientKnownRequestError(
      "Foreign key constraint failed",
      { code: "P2003", clientVersion: "7.0.0" }
    );
    const result = ValidationError.fromPrisma(err);

    expect(result.message).toBe("Foreign key constraint failed");
    expect(result.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
  });
});
