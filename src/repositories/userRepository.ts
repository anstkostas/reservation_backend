import { prisma } from "../config/prismaClient.js";
import { Prisma, type User, type Role } from "../generated/prisma/client.js";

// Transaction client omits connection/lifecycle methods — typed for use inside prisma.$transaction
type TxClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

interface UserFilter {
  role?: Role;
}

export const userRepository = {
  /**
   * Creates a new user record.
   *
   * @param {Prisma.UserCreateInput} data - Fields for the new user
   * @param {TxClient} [tx] - Optional Prisma transaction client
   * @returns {Promise<User>} The created user
   */
  async create(data: Prisma.UserCreateInput, tx?: TxClient): Promise<User> {
    const client = tx ?? prisma;
    return client.user.create({ data });
  },

  /**
   * Finds a single user by primary key.
   *
   * @param {string} id - User UUID
   * @returns {Promise<User | null>} The user, or null if not found
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  /**
   * Finds a single user by email address.
   *
   * @param {string} email - User email (unique)
   * @returns {Promise<User | null>} The user, or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  /**
   * Finds all users matching the given filter.
   *
   * @param {UserFilter} [filter={}] - Optional filter: role
   * @returns {Promise<User[]>} Array of matching users
   */
  async findAll(filter: UserFilter = {}): Promise<User[]> {
    return prisma.user.findMany({
      where: filter.role ? { role: filter.role } : undefined,
    });
  },

  /**
   * Updates a user by ID.
   *
   * @param {string} id - User UUID
   * @param {Prisma.UserUpdateInput} data - Fields to update
   * @returns {Promise<User | null>} The updated user, or null if not found
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User | null> {
    try {
      return await prisma.user.update({ where: { id }, data });
    } catch (err) {
      // P2025 — record not found
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Deletes a user by ID.
   *
   * @param {string} id - User UUID
   * @returns {Promise<User | null>} The deleted user, or null if not found
   */
  async delete(id: string): Promise<User | null> {
    try {
      return await prisma.user.delete({ where: { id } });
    } catch (err) {
      // P2025 — record not found
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Counts users matching the given filter.
   *
   * @param {UserFilter} [filter={}] - Optional filter: role
   * @returns {Promise<number>} Total count of matching users
   */
  async count(filter: UserFilter = {}): Promise<number> {
    return prisma.user.count({
      where: filter.role ? { role: filter.role } : undefined,
    });
  },
};
