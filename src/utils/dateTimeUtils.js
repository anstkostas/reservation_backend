function isInPast(date) {
  const today = new Date();
  return date.getTime() < today.getTime();
}

function getRandomDate() {
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
}

function getRandomTime() {
  const middle = 19;
  const range = 4;
  const randomOffset = Math.floor(Math.random() * (2 * range + 1)) - range;
  const randomTime = middle + randomOffset;
  return randomTime.toString().concat(":").padEnd(5, 0);
}

module.exports = { getRandomDate, getRandomTime };
