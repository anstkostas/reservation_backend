import { prisma } from "@/config/prismaClient.js";
import { Prisma, Role } from "../generated/prisma/index.js";
import { restaurantRepository } from "@/repositories/index.js";
import {
  restaurantOutputDTO,
  restaurantPrivateOutputDTO,
  type RestaurantOutput,
  type RestaurantPrivateOutput,
  type UserOutput,
} from "@/dtos/index.js";
import { NotFoundError, ForbiddenError } from "@/errors/index.js";
import { ERROR_CODES, type SupportedLocale } from "@/constants/index.js";
import type { UpdateRestaurantInput } from "@/validation/index.js";

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

  /**
   * Returns the authenticated owner's own restaurant in the private (owner-facing) shape.
   *
   * @param {UserOutput} user - Authenticated user from req.user
   * @returns {Promise<RestaurantPrivateOutput>}
   * @throws {ForbiddenError} If the user is not an owner
   * @throws {NotFoundError} If the owner has no restaurant
   */
  async getOwnRestaurant(user: UserOutput): Promise<RestaurantPrivateOutput> {
    if (user.role !== Role.owner) {
      throw new ForbiddenError(
        "Only owners can view their restaurant",
        ERROR_CODES.RESTAURANT_OWNER_ONLY
      );
    }
    const restaurant = await restaurantRepository.findByOwnerIdWithTranslations(user.id);
    if (!restaurant) {
      throw new NotFoundError(
        "You do not have a restaurant",
        ERROR_CODES.RESTAURANT_NONE_FOR_OWNER
      );
    }
    return restaurantPrivateOutputDTO(restaurant);
  },

  /**
   * Partially updates the authenticated owner's restaurant. Transactional: the scalar update and
   * the EL-translation upsert commit atomically, then the row is re-read with translations for the DTO.
   *
   * WHY a transaction: scalar columns live on Restaurant while the Greek description lives in a
   * separate restaurant_translations row. Wrapping both writes in one $transaction guarantees a
   * partial failure can never leave the canonical text and its translation out of sync.
   *
   * @param {UserOutput} user - Authenticated user from req.user
   * @param {UpdateRestaurantInput} data - Validated partial payload
   * @returns {Promise<RestaurantPrivateOutput>}
   * @throws {ForbiddenError} If the user is not an owner
   * @throws {NotFoundError} If the owner has no restaurant
   */
  async updateOwnRestaurant(
    user: UserOutput,
    data: UpdateRestaurantInput
  ): Promise<RestaurantPrivateOutput> {
    if (user.role !== Role.owner) {
      throw new ForbiddenError(
        "Only owners can update their restaurant",
        ERROR_CODES.RESTAURANT_OWNER_ONLY
      );
    }

    return prisma.$transaction(async (tx) => {
      const existing = await restaurantRepository.findByOwnerId(user.id, tx);
      if (!existing) {
        throw new NotFoundError(
          "You do not have a restaurant",
          ERROR_CODES.RESTAURANT_NONE_FOR_OWNER
        );
      }

      // Build the scalar update from only the provided fields. description.en is the canonical column.
      const scalarData: Prisma.RestaurantUpdateInput = {};
      if (data.name !== undefined) scalarData.name = data.name;
      if (data.address !== undefined) scalarData.address = data.address;
      if (data.phone !== undefined) scalarData.phone = data.phone;
      if (data.capacity !== undefined) scalarData.capacity = data.capacity;
      if (data.description?.en !== undefined) scalarData.description = data.description.en;

      if (Object.keys(scalarData).length > 0) {
        await restaurantRepository.update(existing.id, scalarData, tx);
      }
      if (data.description?.el !== undefined) {
        await restaurantRepository.upsertTranslation(existing.id, "el", data.description.el, tx);
      }

      const updated = await restaurantRepository.findByOwnerIdWithTranslations(user.id, tx);
      // Guaranteed present — we are inside the same transaction that just confirmed it exists
      return restaurantPrivateOutputDTO(updated!);
    });
  },
};
