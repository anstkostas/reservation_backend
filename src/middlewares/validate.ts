import { z } from "zod";
import { type RequestHandler, Request, Response, NextFunction } from "express";
import { ValidationError } from "../errors/index.js";

/**
 * Returns Express middleware that validates and coerces req[property] against a Zod schema.
 * On success, replaces req[property] with the parsed (and transformed) value.
 * On failure, calls next(ValidationError) with field-level details ({ field, message }) derived from Zod issues.
 *
 * @param {z.ZodTypeAny} schema - Zod schema to validate against
 * @param {"body" | "params" | "query"} [property="body"] - Which part of the request to validate
 * @returns {RequestHandler} Express middleware
 *
 * @example
 * router.post("/", validate(createUserSchema), userController.createUser);
 * router.get("/:id", validate(idParamSchema, "params"), controller.getById);
 */
export function validate(
  schema: z.ZodTypeAny,
  property: "body" | "params" | "query" = "body"
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[property]);
    if (!result.success) {
      return next(
        new ValidationError(
          "Validation failed",
          result.error.issues.map((e) => ({
            // path[0] is the top-level field name; empty string fallback for schema-level errors
            field: String(e.path[0] ?? ""),
            message: e.message,
          }))
        )
      );
    }
    // safe — req.body is typed as any; params/query need double-cast through unknown
    (req as unknown as Record<string, unknown>)[property] = result.data;
    next();
  };
}
