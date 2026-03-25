import { ValidationError } from "../errors/index.js";
import { RESERVATION_BOOKING_WINDOW_MONTHS } from "../constants/index.js";


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
