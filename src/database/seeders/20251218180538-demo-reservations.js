"use strict";

const { v4: uuidv4 } = require('uuid');
const { getRandomTime, getRandomDate } = require("../../utils/dateTimeUtils");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get customer users
    const customers = await queryInterface.sequelize.query(
      `SELECT id FROM Users WHERE role = 'customer'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Get restaurants
    const restaurants = await queryInterface.sequelize.query(
      `SELECT id FROM Restaurants`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
    let randomValues = [];
    for (let i = 0; i < 10; i++) {
      const randDate = getRandomDate();
      randomValues.push({
        id: uuidv4(),
        date: randDate.newDate,
        time: getRandomTime(),
        persons: Math.floor(Math.random() * 10) + 2,
        status: randDate.inPast ? "completed" : "active",
        customerId: random(customers)?.id ?? null,
        restaurantId: random(restaurants)?.id ?? null,
      });
    }
    await queryInterface.bulkInsert("Reservations", randomValues);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Reservations", null, {});
  },
};
