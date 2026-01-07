const { restaurantRepository } = require("../repositories");
const { restaurantDTO } = require("../dtos");
const { NotFoundError } = require("../errors");

module.exports = {
  async getAllRestaurants() {
    const restaurants = await restaurantRepository.findAll();
    return restaurants.map(restaurantDTO.restaurantOutputDTO);
  },

  async getRestaurantById(id) {
    const restaurant = await restaurantRepository.findById(id);
    if (!restaurant) {
      throw new NotFoundError("Restaurant not found");
    }
    return restaurantDTO.restaurantOutputDTO(restaurant);
  },
};
