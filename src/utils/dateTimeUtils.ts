import { ValidationError } from "../errors/index.js";
import { RESERVATION_BOOKING_WINDOW_MONTHS } from "../constants/index.js";

/**
 * Converts an HH:MM time string to a Date object with only the UTC time set.
 * Required because Prisma stores TIME columns as Date — the epoch date is a sentinel;
 * only the UTC time portion (hours/minutes) is meaningful.
 *
 * Symmetric inverse of {@link normalizeDBTime}.
 *
 * @param {string} time - Time string in HH:MM 24-hour format
 * @returns {Date} Date object at epoch with UTC hours/minutes set
 */
export function parseTimeString(time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date(0); // epoch — only UTC time portion stored by @db.Time
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Validates that a reservation's scheduled datetime satisfies the booking window rules.
 *
 * Business rules enforced:
 * - scheduledAt must be at least 30 minutes from now (minimum preparation window)
 * - scheduledAt must be within the next 2 months
 *
 * This function is a guard:
 * - It does not return a value
 * - It throws a ValidationError if either rule is violated
 *
 * @param {Date} scheduledAt - Combined reservation datetime
 *
 * @throws {ValidationError}
 * Thrown when:
 * - scheduledAt is less than 30 minutes from now
 * - scheduledAt exceeds the allowed booking window
 *
 * @example
 * validateReservationDateTime(new Date(data.scheduledAt));
 */
export function validateReservationDateTime(scheduledAt: Date): void {
  const minTime = new Date(Date.now() + 30 * 60 * 1000); // 30-minute minimum lead time
  if (scheduledAt < minTime) {
    throw new ValidationError("Reservation must be at least 30 minutes from now");
  }
  const maxTime = new Date();
  maxTime.setMonth(maxTime.getMonth() + RESERVATION_BOOKING_WINDOW_MONTHS);
  if (scheduledAt > maxTime) {
    throw new ValidationError("Reservation must be within 2 months from today");
  }
}

/**
 * Normalizes a time value returned from the DB into HH:mm string format.
 * PostgreSQL TIME columns can come back as a Date object or a full time string (e.g. "22:00:00.0000000").
 *
 * @param {Date|string} time - Raw time value from the database
 * @returns {string} Normalized time string in HH:mm format
 */
export function normalizeDBTime(time: Date | string): string {
  if (time instanceof Date) {
    const hours = time.getUTCHours().toString().padStart(2, "0");
    const minutes = time.getUTCMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }
  // typeof time === "string" — both branches are exhaustive for Date | string
  return time.substring(0, 5); // (22:00):00.0000000
}
