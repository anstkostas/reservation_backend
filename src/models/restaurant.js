module.exports = (sequelize, dataTypes) => {
  const Restaurant = sequelize.define(
    "Restaurant",
    {
      id: {
        type: dataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: dataTypes.UUIDV4,
      },
      name: {
        type: dataTypes.STRING,
        allowNull: false,
        defaultValue: "",
      },
      description: {
        type: dataTypes.TEXT,
        allowNull: false,
        defaultValue: "",
      },
      capacity: {
        type: dataTypes.INTEGER,
        allowNull: false,
      },
      logoUrl: {
        type: dataTypes.STRING,
        allowNull: false,
      },
      coverImageUrl: {
        type: dataTypes.STRING,
        allowNull: false,
      },
      userId: {
        type: dataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: "Restaurants", // Optional, since sequelize defines it in plural.
      timestamps: false,
    }
  );

  Restaurant.associate = (models) => {
    // Reservation.findAll({ include: ["restaurant", "customer"] });
    Restaurant.belongsTo(models.User, {
      foreignKey: "ownerId",
      as: "owner",
    });
    // for restaurant.getReservations();
    Restaurant.hasMany(models.Reservation, {
      foreignKey: "restaurantId",
      as: "reservations",
    });
  };

  return Restaurant;
};
