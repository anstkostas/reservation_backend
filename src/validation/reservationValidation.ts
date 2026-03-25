import { z } from "zod";

export const createReservationSchema = z.object({
  scheduledAt: z.coerce.date(),
  // default(1) — if omitted, one person is assumed; mirrors the old createReservationInputDTO default
  persons: z.number().int().min(1).default(1),
});

export const updateReservationSchema = z
  .object({
    scheduledAt: z.coerce.date().optional(),
    persons: z.number().int().min(1).optional(),
  })
  // mirrors Joi's .min(1) — at least one field must be present
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "At least one field must be provided",
  });

export const reservationStatusSchema = z.object({
  status: z.enum(["completed", "no-show"]),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
export type ReservationStatusInput = z.infer<typeof reservationStatusSchema>;
