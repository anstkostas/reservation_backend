import { ReservationStatus } from "../generated/prisma/index.js";

// Single source of truth — keys follow SCREAMING_SNAKE_CASE convention;
// values come from Prisma's generated enum to stay in sync with DB queries.
// Note: NO_SHOW value is 'no_show' (Prisma internal) — Prisma maps it to 'no-show' in the DB.
export const RESERVATION_STATUS = {
  ACTIVE: ReservationStatus.active,
  COMPLETED: ReservationStatus.completed,
  CANCELED: ReservationStatus.canceled,
  NO_SHOW: ReservationStatus.no_show,
} as const;

export type ReservationStatusValue =
  (typeof RESERVATION_STATUS)[keyof typeof RESERVATION_STATUS];
