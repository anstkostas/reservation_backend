import { restaurantRepository } from "../repositories/index.js";
import { restaurantOutputDTO, type RestaurantOutput } from "../dtos/index.js";
import { NotFoundError } from "../errors/index.js";
import { ERROR_CODES } from "../constants/index.js";

export const restaurantService = {
  /**
   * Retrieves all restaurants.
   *
   * @returns {Promise<RestaurantOutput[]>} Array of restaurant output DTOs
   */
  async getAllRestaurants(): Promise<RestaurantOutput[]> {
    const restaurants = await restaurantRepository.findAll();
    return restaurants.map(restaurantOutputDTO);
  },

  /**
   * Retrieves a restaurant by its ID.
   *
   * @param {string} id - Restaurant UUID
   * @returns {Promise<RestaurantOutput>} Restaurant output DTO
   * @throws {NotFoundError} If the restaurant is not found
   */
  async getRestaurantById(id: string): Promise<RestaurantOutput> {
    const restaurant = await restaurantRepository.findById(id);
    if (!restaurant) {
      throw new NotFoundError("Restaurant not found", ERROR_CODES.RESTAURANT_NOT_FOUND);
    }
    return restaurantOutputDTO(restaurant);
  },
};
