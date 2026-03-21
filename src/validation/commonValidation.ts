import { z } from "zod";

export const idParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
});

export const restaurantIdParamSchema = z.object({
  restaurantId: z.uuid("restaurantId must be a valid UUID"),
});
