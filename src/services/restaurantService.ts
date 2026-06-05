import { restaurantRepository } from "../repositories/index.js";
import { restaurantOutputDTO, type RestaurantOutput } from "../dtos/index.js";
import { NotFoundError } from "../errors/index.js";
import { ERROR_CODES, type SupportedLocale } from "../constants/index.js";

export const restaurantService = {
  /**
   * Retrieves all restaurants with their description localised to [locale].
   *
   * @param {SupportedLocale} locale - Locale to localise descriptions to
   * @returns {Promise<RestaurantOutput[]>} Array of restaurant output DTOs
   */
  async getAllRestaurants(locale: SupportedLocale): Promise<RestaurantOutput[]> {
    const restaurants = await restaurantRepository.findAllLocalized(locale);
    return restaurants.map(restaurantOutputDTO);
  },

  /**
   * Retrieves a restaurant by its ID with its description localised to [locale].
   *
   * @param {string} id - Restaurant UUID
   * @param {SupportedLocale} locale - Locale to localise the description to
   * @returns {Promise<RestaurantOutput>} Restaurant output DTO
   * @throws {NotFoundError} If the restaurant is not found
   */
  async getRestaurantById(id: string, locale: SupportedLocale): Promise<RestaurantOutput> {
    const restaurant = await restaurantRepository.findByIdLocalized(id, locale);
    if (!restaurant) {
      throw new NotFoundError("Restaurant not found", ERROR_CODES.RESTAURANT_NOT_FOUND);
    }
    return restaurantOutputDTO(restaurant);
  },
};
