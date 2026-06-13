import { prisma } from "@/config/prismaClient.js";
import { Prisma, type Restaurant, type RestaurantTranslation } from "../generated/prisma/index.js";
import { PRISMA_ERROR_CODES, type SupportedLocale } from "@/constants/index.js";

/**
 * A restaurant joined with the translation rows matching a requested locale.
 * `translations` holds 0 or 1 rows (filtered by locale at query time); the DTO
 * falls back to the canonical `description` column when it is empty.
 */
export type RestaurantWithTranslation = Prisma.RestaurantGetPayload<{
  include: { translations: true };
}>;

export const restaurantRepository = {
  /**
   * Finds a single restaurant by primary key.
   *
   * @param {string} id - Restaurant UUID
   * @param {Prisma.TransactionClient} [tx] - Optional Prisma transaction client
   * @returns {Promise<Restaurant | null>} The restaurant, or null if not found
   */
  async findById(id: string, tx?: Prisma.TransactionClient): Promise<Restaurant | null> {
    const client = tx ?? prisma;
    return client.restaurant.findUnique({ where: { id } });
  },

  /**
   * Finds all restaurants.
   *
   * @returns {Promise<Restaurant[]>} Array of all restaurants
   */
  async findAll(): Promise<Restaurant[]> {
    return prisma.restaurant.findMany();
  },

  /**
   * Finds all restaurants, each joined with its translation for [locale] (if one exists).
   *
   * @param {SupportedLocale} locale - Locale whose translation rows to include
   * @returns {Promise<RestaurantWithTranslation[]>} Restaurants, each with 0 or 1 matching translation
   */
  async findAllLocalized(locale: SupportedLocale): Promise<RestaurantWithTranslation[]> {
    return prisma.restaurant.findMany({
      include: { translations: { where: { locale } } },
    });
  },

  /**
   * Finds a single restaurant by primary key, joined with its translation for [locale] (if one exists).
   *
   * @param {string} id - Restaurant UUID
   * @param {SupportedLocale} locale - Locale whose translation row to include
   * @returns {Promise<RestaurantWithTranslation | null>} The restaurant (with 0 or 1 translation), or null
   */
  async findByIdLocalized(
    id: string,
    locale: SupportedLocale
  ): Promise<RestaurantWithTranslation | null> {
    return prisma.restaurant.findUnique({
      where: { id },
      include: { translations: { where: { locale } } },
    });
  },

  /**
   * Finds all restaurants with no owner assigned.
   *
   * @returns {Promise<Restaurant[]>} Restaurants where ownerId is null
   */
  async findUnowned(): Promise<Restaurant[]> {
    return prisma.restaurant.findMany({ where: { ownerId: null } });
  },

  /**
   * Finds the restaurant owned by a specific user.
   *
   * @param {string} ownerId - Owner's user UUID
   * @param {Prisma.TransactionClient} [tx] - Optional Prisma transaction client
   * @returns {Promise<Restaurant | null>} The restaurant, or null if none found
   */
  async findByOwnerId(ownerId: string, tx?: Prisma.TransactionClient): Promise<Restaurant | null> {
    const client = tx ?? prisma;
    // ownerId is @unique on Restaurant — findUnique is safe here
    return client.restaurant.findUnique({ where: { ownerId } });
  },

  /**
   * Finds the restaurant owned by [ownerId], joined with ALL its translation rows.
   * Used by the owner read/update flows which need every locale, not just one.
   *
   * @param {string} ownerId - Owner's user UUID
   * @param {Prisma.TransactionClient} [tx]
   * @returns {Promise<RestaurantWithTranslation | null>}
   */
  async findByOwnerIdWithTranslations(
    ownerId: string,
    tx?: Prisma.TransactionClient
  ): Promise<RestaurantWithTranslation | null> {
    const client = tx ?? prisma;
    return client.restaurant.findUnique({
      where: { ownerId },
      include: { translations: true },
    });
  },

  /**
   * Updates a restaurant's scalar columns. DB-only — the caller builds the data object.
   * Maps P2025 (record not found) to null, mirroring assignOwner.
   *
   * @param {string} id - Restaurant UUID
   * @param {Prisma.RestaurantUpdateInput} data - Pre-built scalar update payload
   * @param {Prisma.TransactionClient} [tx]
   * @returns {Promise<Restaurant | null>}
   */
  async update(
    id: string,
    data: Prisma.RestaurantUpdateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Restaurant | null> {
    const client = tx ?? prisma;
    try {
      return await client.restaurant.update({ where: { id }, data });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND
      ) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Upserts the translation row for one (restaurant, locale) pair. Uses the
   * @@unique([restaurantId, locale]) compound key (Prisma name: restaurantId_locale).
   *
   * @param {string} restaurantId
   * @param {string} locale - e.g. "el"
   * @param {string} description
   * @param {Prisma.TransactionClient} [tx]
   * @returns {Promise<RestaurantTranslation>}
   */
  async upsertTranslation(
    restaurantId: string,
    locale: string,
    description: string,
    tx?: Prisma.TransactionClient
  ): Promise<RestaurantTranslation> {
    const client = tx ?? prisma;
    return client.restaurantTranslation.upsert({
      where: { restaurantId_locale: { restaurantId, locale } },
      create: { restaurantId, locale, description },
      update: { description },
    });
  },

  /**
   * Assigns a user as the owner of a restaurant.
   *
   * @param {string} id - Restaurant UUID
   * @param {string} ownerId - User UUID to assign as owner
   * @param {Prisma.TransactionClient} [tx] - Optional Prisma transaction client
   * @returns {Promise<Restaurant | null>} The updated restaurant, or null if not found
   */
  async assignOwner(
    id: string,
    ownerId: string,
    tx?: Prisma.TransactionClient
  ): Promise<Restaurant | null> {
    const client = tx ?? prisma;
    try {
      return await client.restaurant.update({
        where: { id },
        data: { ownerId },
      });
    } catch (err) {
      // P2025 — restaurant not found
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND
      ) {
        return null;
      }
      throw err;
    }
  },
};
