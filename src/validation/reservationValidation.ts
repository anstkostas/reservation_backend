import { z } from "zod";

export const createReservationSchema = z.object({
  scheduledAt: z.coerce.date(),
  // default(1) — if omitted, one person is assumed; mirrors the old createReservationInputDTO default
  // max(20) — sanity cap only; people is informational and does not affect capacity
  // (capacity is measured in simultaneous reservations, not headcount — see CLAUDE.md conventions)
  people: z.number().int().min(1).max(20).default(1),
});

export const updateReservationSchema = z
  .object({
    scheduledAt: z.coerce.date().optional(),
    // max(20) — same sanity cap as createReservationSchema; see note above
    people: z.number().int().min(1).max(20).optional(),
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
