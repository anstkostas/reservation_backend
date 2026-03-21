import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prismaClient.js";
import { NotAuthenticatedError } from "../errors/index.js";
import { AUTH_CONFIG, COOKIE_CONFIG } from "../config/env.js";
import { userOutputDTO } from "../dtos/index.js";

/**
 * Middleware to ensure the user is authenticated.
 * Reads the JWT from the configured httpOnly cookie, verifies it, and attaches
 * the sanitized user object to req.user for downstream handlers.
 *
 * @throws {NotAuthenticatedError} If cookie is missing, token is absent/invalid/expired, or user no longer exists
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (req.method === "OPTIONS") return next(); // allow CORS preflight requests through without auth

  try {
    if (req.cookies === undefined) {
      return next(new NotAuthenticatedError("Cookie parser middleware not configured"));
    }

    const token: string | undefined = req.cookies[COOKIE_CONFIG.NAME];
    if (!token) {
      return next(new NotAuthenticatedError("No authentication token provided"));
    }

    if (!AUTH_CONFIG.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    // cast is safe — we control the payload shape when signing
    const payload = jwt.verify(token, AUTH_CONFIG.JWT_SECRET) as jwt.JwtPayload;
    const userId = payload["id"] as string;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return next(new NotAuthenticatedError("User not found"));
    }

    req.user = userOutputDTO(user);
    next();
  } catch (err) {
    if (err instanceof Error && err.name === "TokenExpiredError") {
      return next(new NotAuthenticatedError("Token expired"));
    }
    if (err instanceof Error && err.name === "JsonWebTokenError") {
      return next(new NotAuthenticatedError("Invalid token"));
    }
    next(err);
  }
}
