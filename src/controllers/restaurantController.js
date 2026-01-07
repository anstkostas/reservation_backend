const { restaurantService } = require("../services");
const { sendResponse } = require("../utils");

module.exports = {
  async getAllRestaurants(req, res, next) {
    try {
      const restaurants = await restaurantService.getAllRestaurants();
      return sendResponse(res, restaurants);
    } catch (err) {
      next(err);
    }
  },

  async getRestaurantById(req, res, next) {
    try {
      const { id } = req.params;
      const restaurant = await restaurantService.getRestaurantById(id);
      return sendResponse(res, restaurant);
    } catch (err) {
      next(err);
    }
  },
};
