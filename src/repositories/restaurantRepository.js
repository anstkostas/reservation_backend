const { Restaurant } = require("../models");

module.exports = {
  async findById(id, options = {}) {
    return Restaurant.findByPk(id, options);
  },

  async findByOwnerId(ownerId) {
    return Restaurant.findOne({ where: { ownerId } });
  },

  async findAll() {
    return Restaurant.findAll();
  },

  async findAllByRestaurant(restaurantId, status = "active") {
    return Reservation.findAll({
      where: { restaurantId, status },
      include: ["customer"],
    });
  },

  async update(id, updatedData, options = {}) {
    const restaurant = await Restaurant.findByPk(id, options);
    if (!restaurant) return null;
    return restaurant.update(updatedData);
  },
};
