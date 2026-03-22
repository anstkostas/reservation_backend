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

export const updateRestaurantSchema = z.object({
  name: z.string().min(4).max(100).optional(),
  capacity: z.number().int().min(1).optional(),
  description: z.string().max(500).optional().or(z.literal("")),
  logoUrl: z.url().optional(),
  coverImageUrl: z.url().optional(),
  ownerId: z.uuid().optional(),
});

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
