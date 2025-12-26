const { Restaurant } = require("../models");

module.exports = {
  async findById(id, options = {}) {
    return Restaurant.findByPk(id, options);
  },

  async findAll() {
    return Restaurant.findAll();
  },

  async update(id, updatedData, options = {}) {
    const restaurant = await Restaurant.findByPk(id, options);
    if (!restaurant) return null;
    return restaurant.update(updatedData);
  },
};
