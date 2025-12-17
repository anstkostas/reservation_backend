const { DateTime } = require("mssql");

module.exports = (sequelize, dataTypes) => {
  const Reservation = sequelize.define(
    "Reservation",
    {
      id: {
        type: dataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: dataTypes.UUIDV4,
      },
      date: {
        type: dataTypes.DATEONLY,
        allowNull: false,
      },
      time: {
        type: dataTypes.TIME,
        allowNull: false,
      },
      persons: {
        type: dataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: dataTypes.ENUM("active", "canceled", "completed"),
        allowNull: false,
        defaultValue: "active"
      },
      restaurantId: {
        type: dataTypes.UUIDV4,
        allowNull: false,
      },
      customerId: {
        type: dataTypes.UUIDV4,
        allowNull: false,
      },
    },
    {
      tableName: "Reservations",
      timestamps: false,
    }
  );

  Reservation.associate = (models) => {
    Reservation.belongsTo(models.Restaurant, {
      foreignKey: "restaurantId",
      as: "restaurant",
    });
    Reservation.belongsTo(models.User, {
      foreignKey: "customerId",
      as: "customer",
    });
  };

  return Reservation;
};
