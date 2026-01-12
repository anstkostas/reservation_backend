"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      {
        tableName: "Restaurants",
        schema: "dbo",
      },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: "",
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: false,
          defaultValue: "",
        },
        address: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: "",
        },
        phone: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: "",
        },
        capacity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        logoUrl: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: "",
        },
        coverImageUrl: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: "",
        },
        ownerId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: {
              tableName: "Users",
              schema: "dbo",
            },
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Restaurants");
  },
};
