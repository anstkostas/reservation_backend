import { z } from "zod";

const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().regex(
    passwordPattern,
    "Password must be at least 8 characters, include uppercase, lowercase, number, and special character"
  ),
  firstname: z.string().min(4).max(50),
  lastname: z.string().min(4).max(50),
  role: z.enum(["owner", "customer"]),
  // allow null, undefined, or empty string — owner signup passes this; customer signup omits it
  restaurantId: z.string().uuid().nullish().or(z.literal("")),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
