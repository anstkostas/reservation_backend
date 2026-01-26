"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "Users",
      {
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
          // type: Sequelize.ENUM("customer", "owner"),
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: "customer",
        },
      }
    );
    await queryInterface.addConstraint(
      "Users",
      {
        fields: ["role"],
        type: "check",
        where: {
          role: ["customer", "owner"],
        },
        name: "users_role_check",
      }
    );
  },
  async down(queryInterface) {
    await queryInterface.dropTable("Users");
  },
};
