"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      {
        tableName: "Reservations",
        schema: "dbo",
      },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        time: {
          type: Sequelize.TIME,
          allowNull: false,
        },
        persons: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM("active", "canceled", "completed"),
          allowNull: false,
          defaultValue: "active",
        },
        restaurantId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: {
              tableName: "Restaurants",
              schema: "dbo",
            },
            key: "id",
          },
          onUpdate: "CASCADE", // This fk follows the parent model id.
          onDelete: "CASCADE", // This record is deleted if parent is deleted as well.
        },
        customerId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: {
              tableName: "Users",
              schema: "dbo",
            },
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Reservations");

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Reservations_status";'
    );
  },
};
