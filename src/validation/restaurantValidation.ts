// For future use — restaurant create/update routes are not yet implemented
import { z } from "zod";

export const createRestaurantSchema = z.object({
  name: z.string().min(4).max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  capacity: z.number().int().positive(),
  logoUrl: z.url(),
  coverImageUrl: z.url(),
  ownerId: z.uuid().optional(),
});

export const updateRestaurantSchema = z
  .object({
    name: z.string().trim().min(4).max(100).optional(),
    description: z
      .object({
        en: z.string().trim().min(1).max(500).optional(),
        el: z.string().trim().max(500).optional(),
      })
      .optional(),
    address: z.string().trim().min(1).max(255).optional(),
    phone: z.string().trim().min(1).max(30).optional(),
    capacity: z.number().int().min(1).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "At least one field must be provided",
  });

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
