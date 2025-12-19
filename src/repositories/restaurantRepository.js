import { Restaurant } from '../models/restaurant.js';

export const RestaurantRepository = {
  async create(restaurantData) {
    return Restaurant.create(restaurantData);
  },

  async findById(id) {
    return Restaurant.findByPk(id);
  },

  async findAll(filter = {}) {
    const where = {};
    if (filter.ownerId) where.ownerId = filter.ownerId;
    return Restaurant.findAll({ where });
  },

  async update(id, updatedData) {
    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) return null;
    return restaurant.update(updatedData);
  },

  async delete(id) {
    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) return null;
    await restaurant.destroy();
    return restaurant;
  },

  async count(filter = {}) {
    const where = {};
    if (filter.ownerId) where.ownerId = filter.ownerId;
    return Restaurant.count({ where });
  }
};
