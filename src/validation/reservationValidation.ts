import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createReservationSchema = z.object({
  date: z.coerce.date(),
  time: z.string().regex(timePattern, "Time must be in HH:MM format"),
  persons: z.number().int().min(1),
});

export const updateReservationSchema = z
  .object({
    date: z.coerce.date().optional(),
    time: z.string().regex(timePattern, "Time must be in HH:MM format").optional(),
    persons: z.number().int().min(1).optional(),
  })
  // mirrors Joi's .min(1) — at least one field must be present
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: "At least one field must be provided" }
  );

export const reservationStatusSchema = z.object({
  status: z.enum(["completed", "no-show"]),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
export type ReservationStatusInput = z.infer<typeof reservationStatusSchema>;
