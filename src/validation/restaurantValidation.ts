import { z } from "zod";

export const createRestaurantSchema = z.object({
  name: z.string().min(4).max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  capacity: z.number().int().positive(),
  logoUrl: z.string().url(),
  coverImageUrl: z.string().url(),
  ownerId: z.string().uuid().optional(),
});

export const updateRestaurantSchema = z.object({
  name: z.string().min(4).max(100).optional(),
  capacity: z.number().int().min(1).optional(),
  description: z.string().max(500).optional().or(z.literal("")),
  logoUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  ownerId: z.string().uuid().optional(),
});

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
