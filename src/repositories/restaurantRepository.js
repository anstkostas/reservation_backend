const { Restaurant } = require("../models");

module.exports = {
  async findById(id, options = {}) {
    return Restaurant.findByPk(id, options);
  },

  async findAll() {
    return Restaurant.findAll();
  },

  async findByOwnerId(ownerId) {
    console.log(ownerId);
    return Restaurant.findOne({ where: { ownerId: ownerId } });
  },
};
