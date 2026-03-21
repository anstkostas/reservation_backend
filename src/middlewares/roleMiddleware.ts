import { type RequestHandler, Request, Response, NextFunction } from "express";
import { Role } from "../generated/prisma/client.js";
import { ForbiddenError } from "../errors/index.js";

/**
 * Enforce role-based access. Request proceeds only if req.user.role matches the required role.
 *
 * @param {"customer" | "owner"} requiredRole - The role required to access the route
 * @returns {Function} Express middleware
 * @throws {ForbiddenError} If the user's role does not match
 *
 * @example
 * router.post("/path", requireAuth, requireRole("owner"), handler)
 */
export function requireRole(requiredRole: Role): RequestHandler {
  return function roleMiddleware(req: Request, _res: Response, next: NextFunction): void {
    if (!req.user || req.user.role !== requiredRole) {
      return next(
        new ForbiddenError("You do not have permission to access this resource")
      );
    }
    next();
  };
}
