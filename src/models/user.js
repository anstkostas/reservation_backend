module.exports = (sequelize, dataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: dataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: dataTypes.UUIDV4,
      },
      firstname: {
        type: dataTypes.STRING(100),
        allowNull: false,
        defaultValue: "",
      },
      lastname: {
        type: dataTypes.STRING(100),
        allowNull: false,
        defaultValue: "",
      },
      email: {
        type: dataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: dataTypes.STRING(100),
        allowNull: false,
      },
      role: {
        type: dataTypes.ENUM("customer", "owner"),
        allowNull: false,
        defaultValue: "customer",
      },
    },
    {
      tableName: "Users",
      schema: "dbo",
      timestamps: false,
    }
  );

  User.associate = (models) => {
    User.hasOne(models.Restaurant, {
      foreignKey: "ownerId",
      as: "restaurants",
    });
    User.hasMany(models.Reservation, {
      foreignKey: "customerId",
      as: "reservations",
    });
  };

  return User;
};
