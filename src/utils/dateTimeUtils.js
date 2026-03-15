const { ValidationError } = require("../errors");

module.exports = {
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
  validateReservationDateTime(date, time) {
    const [h, m] = time.split(":").map(Number);
    const dt = new Date(date);
    dt.setHours(h, m, 0, 0);
    const now = new Date();
    if (dt < now) {
      throw new ValidationError("Reservation datetime cannot be in the past");
    }
    const twoMonthsFromNow = new Date();
    twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
    if (dt > twoMonthsFromNow) {
      throw new ValidationError(
        "Reservation must be within 2 months from today"
      );
    }
  },

  /**
   * Normalizes a time value returned from the DB into HH:mm string format.
   * PostgreSQL TIME columns can come back as a Date object or a full time string (e.g. "22:00:00.0000000").
   *
   * @param {Date|string} time - Raw time value from the database
   * @returns {string} Normalized time string in HH:mm format
   */
  normalizeDBTime(time) {
    if (time instanceof Date) {
      const hours = time.getUTCHours().toString().padStart(2, '0');
      const minutes = time.getUTCMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    if (typeof time === 'string') {
      return time.substring(0, 5);  // (22:00):00.0000000
    }
    return time;
  },
};
