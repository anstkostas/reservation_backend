"use strict";

const { v4: uuidv4 } = require('uuid');

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
  const inPast = randomDate < today;
  return { newDate, inPast };
}

function getRandomTime() {
  const middle = 19;
  const range = 4;
  const randomOffset = Math.floor(Math.random() * (2 * range + 1)) - range;
  const randomTime = middle + randomOffset;
  return randomTime.toString().concat(":").padEnd(5, 0);
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get customer users
    const customers = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE role = 'customer'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Get restaurants
    const restaurants = await queryInterface.sequelize.query(
      `SELECT id FROM "Restaurants"`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const randomValues = [];
    for (let i = 0; i < 10; i++) {
      const randDate = getRandomDate();
      randomValues.push({
        id: uuidv4(),
        date: randDate.newDate,
        time: getRandomTime(),
        persons: Math.floor(Math.random() * 10) + 2,
        status: randDate.inPast ? Math.random() < 0.6 ? "completed" : "no-show" : "active",
        customerId: random(customers)?.id ?? null,
        restaurantId: random(restaurants)?.id ?? null,
      });
    }
    await queryInterface.bulkInsert("Reservations", randomValues);
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.bulkDelete("Reservations", null, {});
  },
};
