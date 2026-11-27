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

/**
 * The restaurant columns an owner may edit. A whitelist (not Prisma's full update input) so
 * ownership can never change through `update` — the owner is permanent once assigned.
 */
export type RestaurantEditableFields = Pick<
  Prisma.RestaurantUpdateInput,
  "name" | "description" | "address" | "phone" | "capacity"
>;

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
   * Updates a restaurant's owner-editable columns (name, description, address, phone, capacity).
   * Ownership is never written here — use `assignOwner`. Maps P2025 (record not found) to null.
   *
   * @param {string} id - Restaurant UUID
   * @param {RestaurantEditableFields} data - Fields to change; omitted fields are left as is
   * @param {Prisma.TransactionClient} [tx]
   * @returns {Promise<Restaurant | null>}
   * @throws {Error} Any DB error other than record-not-found (P2025) — propagates to globalErrorHandler
   */
  async update(
    id: string,
    data: RestaurantEditableFields,
    tx?: Prisma.TransactionClient
  ): Promise<Restaurant | null> {
    const client = tx ?? prisma;
    // Copy only the whitelisted fields: TypeScript blocks extra keys on object literals only, so a
    // wider object (e.g. carrying owner: { connect }) could still reach here at runtime. Prisma
    // ignores the undefined ones, so omitted fields stay unchanged.
    const { name, description, address, phone, capacity } = data;
    try {
      return await client.restaurant.update({
        where: { id },
        data: { name, description, address, phone, capacity },
      });
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
   * Assigns a user as the owner of a restaurant — only if it has no owner yet.
   * The `ownerId: null` condition is part of the write itself, so two concurrent signups for the
   * same restaurant cannot both succeed, and an existing owner is never overwritten.
   *
   * @param {string} id - Restaurant UUID
   * @param {string} ownerId - User UUID to assign as owner
   * @param {Prisma.TransactionClient} [tx] - Optional Prisma transaction client
   * @returns {Promise<boolean>} True if the owner was assigned; false if the restaurant does not exist or already has an owner
   * @throws {Error} Any DB error (e.g. FK violation for an unknown user) — propagates to globalErrorHandler
   */
  async assignOwner(
    id: string,
    ownerId: string,
    tx?: Prisma.TransactionClient
  ): Promise<boolean> {
    const client = tx ?? prisma;
    const { count } = await client.restaurant.updateMany({
      where: { id, ownerId: null },
      data: { ownerId },
    });
    return count === 1;
  },
};
