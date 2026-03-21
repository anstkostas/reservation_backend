// Usage: validate(schema, property)
// property -> "body" (default), "params", "query"
// router.post("/", validate(createUserSchema), userController.createUser);
import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { ValidationError } from "../errors/index.js";

export function validate(
  schema: z.ZodTypeAny,
  property: "body" | "params" | "query" = "body"
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[property]);
    if (!result.success) {
      return next(
        new ValidationError(
          "Validation failed",
          result.error.issues.map((e) => e.message)
        )
      );
    }
    // safe — req.body is typed as any; params/query need double-cast through unknown
    (req as unknown as Record<string, unknown>)[property] = result.data;
    next();
  };
}
