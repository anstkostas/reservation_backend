import { z } from "zod";

const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export const createUserSchema = z.object({
  // .transform() runs after validation — email is valid before it's lowercased
  email: z.email().transform((v) => v.trim().toLowerCase()),
  password: z.string().regex(
    passwordPattern,
    "Password must be at least 8 characters, include uppercase, lowercase, number, and special character"
  ),
  firstname: z.string().min(4).max(50).transform((v) => v.trim()),
  lastname: z.string().min(4).max(50).transform((v) => v.trim()),
  role: z.enum(["owner", "customer"]),
  // empty string, null, or undefined → null; valid UUID passes through
  restaurantId: z
    .uuid()
    .nullish()
    .or(z.literal(""))
    .transform((v) => v || null),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const loginSchema = z.object({
  email: z.email().transform((v) => v.trim().toLowerCase()),
  // min(1) — non-empty; hashing is handled by the service
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
