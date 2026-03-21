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
 * Validates that a reservation date + time represent a valid future datetime
 * within the allowed booking window.
 *
 * Business rules enforced:
 * - Combined date and time must not be in the past
 * - Combined datetime must be within the next 2 months
 *
 * This function is a guard:
 * - It does not return a value
 * - It throws a ValidationError if the rules are violated
 *
 * @param {Date|string} date - Reservation date (Date object or ISO-compatible string)
 * @param {string} time - Reservation time in HH:mm 24-hour format
 *
 * @throws {ValidationError}
 * Thrown when:
 * - The combined datetime is in the past
 * - The combined datetime exceeds the allowed booking window
 *
 * @example
 * validateReservationDateTime("2025-09-10", "18:30");
 *
 * @example
 * validateReservationDateTime(reservation.date, reservation.time);
 */
export function validateReservationDateTime(date: Date | string, time: string): void {
  const [h, m] = time.split(":").map(Number);
  const dt = new Date(date);
  dt.setUTCHours(h, m, 0, 0);
  const now = new Date();
  if (dt < now) {
    throw new ValidationError("Reservation datetime cannot be in the past");
  }
  const twoMonthsFromNow = new Date();
  twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + RESERVATION_BOOKING_WINDOW_MONTHS);
  if (dt > twoMonthsFromNow) {
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
