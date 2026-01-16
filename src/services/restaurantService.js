const { restaurantRepository } = require("../repositories");
const { restaurantDTO } = require("../dtos");
const { NotFoundError } = require("../errors");

module.exports = {
  /**
   * Retrieves all restaurants.
   *
   * @async
   * @returns {Promise<Array<Object>>} A list of restaurant DTOs.
   */
  async getAllRestaurants() {
    const restaurants = await restaurantRepository.findAll();
    return restaurants.map(restaurantDTO.restaurantOutputDTO);
  },

  /**
   * Retrieves a restaurant by its ID.
   *
   * @async
   * @param {number} id - The ID of the restaurant.
   * @returns {Promise<Object>} The restaurant DTO.
   * @throws {NotFoundError} If the restaurant is not found.
   */
  async getRestaurantById(id) {
    const restaurant = await restaurantRepository.findById(id);
    if (!restaurant) {
      throw new NotFoundError("Restaurant not found");
    }
    return restaurantDTO.restaurantOutputDTO(restaurant);
  },
};
