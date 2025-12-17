"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Users", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
      },
      firstname: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "",
      },
      lastname: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "",
      },
      email: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM("customer", "owner"),
        allowNull: false,
        defaultValue: "customer",
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Users");

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Users_role";'
    );
  },
};
