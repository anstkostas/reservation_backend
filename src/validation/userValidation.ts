import { z } from "zod";

const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export const createUserSchema = z
  .object({
    // .transform() runs after validation — email is valid before it's lowercased
    email: z.email().transform((v) => v.trim().toLowerCase()),
    password: z
      .string()
      .regex(
        passwordPattern,
        "Password must be at least 8 characters, include uppercase, lowercase, number, and special character"
      ),
    firstname: z
      .string()
      .min(2)
      .max(50)
      .transform((v) => v.trim()),
    lastname: z
      .string()
      .min(2)
      .max(50)
      .transform((v) => v.trim()),
    role: z.enum(["customer", "owner"]),
    // empty string, null, or undefined → null; valid UUID passes through
    restaurantId: z
      .uuid()
      .nullish()
      .or(z.literal(""))
      .transform((v) => v || null),
  })
  .refine((data) => data.role !== "owner" || data.restaurantId !== null, {
    message: "Restaurant is required for owner role",
    path: ["restaurantId"],
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const loginSchema = z.object({
  email: z.email().transform((v) => v.trim().toLowerCase()),
  // min(1) — non-empty; hashing is handled by the service
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
