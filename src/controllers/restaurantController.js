const { restaurantService } = require("../services");
const { sendResponse } = require("../utils");
const { HTTP_STATUS, RESPONSE_MESSAGES } = require("../constants");

module.exports = {
  async getAllRestaurants(req, res, next) {
    try {
      const restaurants = await restaurantService.getAllRestaurants();
      return sendResponse(res, restaurants, HTTP_STATUS.OK, RESPONSE_MESSAGES.RESTAURANT.LIST_RETRIEVED);
    } catch (err) {
      next(err);
    }
  },

  async getRestaurantById(req, res, next) {
    try {
      const { id } = req.params;
      const restaurant = await restaurantService.getRestaurantById(id);
      return sendResponse(res, restaurant, HTTP_STATUS.OK, RESPONSE_MESSAGES.RESTAURANT.RETRIEVED);
    } catch (err) {
      next(err);
    }
  },
};
