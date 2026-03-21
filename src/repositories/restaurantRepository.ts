import { prisma } from "../config/prismaClient.js";
import { Prisma, type Restaurant } from "../generated/prisma/client.js";

// Transaction client omits connection/lifecycle methods — typed for use inside prisma.$transaction
type TxClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export const restaurantRepository = {
  /**
   * Finds a single restaurant by primary key.
   *
   * @param {string} id - Restaurant UUID
   * @param {TxClient} [tx] - Optional Prisma transaction client
   * @returns {Promise<Restaurant | null>} The restaurant, or null if not found
   */
  async findById(id: string, tx?: TxClient): Promise<Restaurant | null> {
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
   * @returns {Promise<Restaurant | null>} The restaurant, or null if none found
   */
  async findByOwnerId(ownerId: string): Promise<Restaurant | null> {
    // ownerId is @unique on Restaurant — findUnique is safe here
    return prisma.restaurant.findUnique({ where: { ownerId } });
  },

  /**
   * Assigns a user as the owner of a restaurant.
   *
   * @param {string} id - Restaurant UUID
   * @param {string} ownerId - User UUID to assign as owner
   * @param {TxClient} [tx] - Optional Prisma transaction client
   * @returns {Promise<Restaurant | null>} The updated restaurant, or null if not found
   */
  async assignOwner(
    id: string,
    ownerId: string,
    tx?: TxClient
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
        err.code === "P2025"
      ) {
        return null;
      }
      throw err;
    }
  },
};
