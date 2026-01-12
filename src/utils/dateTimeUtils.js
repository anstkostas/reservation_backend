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

  getRandomDate() {
    const today = new Date();
    const twoMonths = 60 * 24 * 60 * 60 * 1000;
    const randomOffset =
      Math.floor(Math.random() * (2 * twoMonths + 1)) - twoMonths;
    const randomDate = new Date(today.getTime() + randomOffset);
    const year = randomDate.getFullYear();
    const month = String(randomDate.getMonth() + 1).padStart(2, "0");
    const day = String(randomDate.getDate()).padStart(2, "0");
    const newDate = `${year}-${month}-${day}`;
    const inPast = randomDate < today;
    return { newDate, inPast };
  },

  getRandomTime() {
    const middle = 19;
    const range = 4;
    const randomOffset = Math.floor(Math.random() * (2 * range + 1)) - range;
    const randomTime = middle + randomOffset;
    return randomTime.toString().concat(":").padEnd(5, 0);
  },

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
