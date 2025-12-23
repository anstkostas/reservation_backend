module.exports = {
  isInPast(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d)) {
      throw new Error("Invalid date");
    }
    return d < new Date();
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
    const inPast = isInPast(randomDate);
    return { newDate, inPast };
  },

  getRandomTime() {
    const middle = 19;
    const range = 4;
    const randomOffset = Math.floor(Math.random() * (2 * range + 1)) - range;
    const randomTime = middle + randomOffset;
    return randomTime.toString().concat(":").padEnd(5, 0);
  },

  isWithinTwoMonths(date) {
    const MAX_MONTHS_AHEAD = 2;
    const now = new Date();
    const max = new Date();
    max.setMonth(max.getMonth() + MAX_MONTHS_AHEAD);
    return date >= now && date <= max;
  },
};
