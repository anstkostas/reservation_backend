import { prisma } from "../config/prismaClient.js";
import { Prisma, type Restaurant } from "../generated/prisma/index.js";
import { PRISMA_ERROR_CODES } from "../constants/index.js";

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
