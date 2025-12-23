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
        defaultValue: 0
      },
      logoUrl: {
        type: dataTypes.STRING,
        allowNull: false,
        defaultValue: ""
      },
      coverImageUrl: {
        type: dataTypes.STRING,
        allowNull: false,
        defaultValue: ""
      },
      ownerId: {
        type: dataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: "Restaurants",
      timestamps: false,
    }
  );

  Restaurant.associate = (models) => {
    Restaurant.belongsTo(models.User, {
      foreignKey: "ownerId",
      as: "owner",
    });
    Restaurant.hasMany(models.Reservation, {
      foreignKey: "restaurantId",
      as: "reservations",
    });
  };

  return Restaurant;
};
