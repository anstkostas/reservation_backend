"use strict";
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const passwordHash = async (password) => bcrypt.hash(password, 10);

    await queryInterface.bulkInsert("Users", [
      {
        id: uuidv4(),
        firstname: "Owner",
        lastname: "One",
        email: "owner1@restaurant.com",
        password: await passwordHash("rest123"),
        role: "owner",
      },
      {
        id: uuidv4(),
        firstname: "Owner",
        lastname: "Two",
        email: "owner2@restaurant.com",
        password: await passwordHash("rest123"),
        role: "owner",
      },
      {
        id: uuidv4(),
        firstname: "Owner",
        lastname: "Three",
        email: "owner3@restaurant.com",
        password: await passwordHash("rest123"),
        role: "owner",
      },
      {
        id: uuidv4(),
        firstname: "Owner",
        lastname: "Four",
        email: "owner4@restaurant.com",
        password: await passwordHash("rest123"),
        role: "owner",
      },
      {
        id: uuidv4(),
        firstname: "Owner",
        lastname: "Five",
        email: "owner5@restaurant.com",
        password: await passwordHash("rest123"),
        role: "owner",
      },
      {
        id: uuidv4(),
        firstname: "Owner",
        lastname: "Six",
        email: "owner6@restaurant.com",
        password: await passwordHash("rest123"),
        role: "owner",
      },
      {
        id: uuidv4(),
        firstname: "Customer",
        lastname: "One",
        email: "customer1@test.com",
        password: await passwordHash("cust123"),
        role: "customer",
      },
      {
        id: uuidv4(),
        firstname: "Customer",
        lastname: "Two",
        email: "customer2@test.com",
        password: await passwordHash("cust123"),
        role: "customer",
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Users", null, {});
  },
};
