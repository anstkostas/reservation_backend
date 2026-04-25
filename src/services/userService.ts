import bcrypt from "bcryptjs";
import { prisma } from "../config/prismaClient.js";
import { Role } from "../generated/prisma/index.js";
import { userRepository, restaurantRepository } from "../repositories/index.js";
import {
  userOutputDTO,
  restaurantOutputDTO,
  type UserOutput,
  type RestaurantOutput,
} from "../dtos/index.js";
import { NotFoundError, ValidationError } from "../errors/index.js";
import { SALT_ROUNDS } from "../constants/index.js";
import type { CreateUserInput } from "../validation/index.js";

export const userService = {
  /**
   * Creates a new user and (optionally) assigns restaurant ownership.
   *
   * IMPORTANT: This operation is TRANSACTIONAL.
   *
   * Reason:
   * Creating a user and assigning a restaurant owner are a single business action.
   * If either step fails, the database must remain unchanged.
   *
   * Transaction guarantees:
   * - User is not created unless owner assignment also succeeds
   * - Restaurant is not modified unless user creation also succeeds
   * - Prevents inconsistent state (e.g. user exists but restaurant still unowned)
   *
   * Business rules enforced:
   * - Email must be unique
   * - Password is hashed before persistence
   * - Role comes from the validated request payload ('customer' | 'owner')
   * - Owners must claim an existing, unowned restaurant
   *
   * @param {CreateUserInput} data - Validated and sanitized signup input (from Zod)
   * @returns {Promise<UserOutput>} Safe user output DTO
   * @throws {ValidationError} If email is taken or business rules are violated
   * @throws {NotFoundError} If the claimed restaurant does not exist
   */
  async createUser(data: CreateUserInput): Promise<UserOutput> {
    const { email, password, firstname, lastname, role: roleInput, restaurantId } = data;

    const exists = await userRepository.findByEmail(email);
    if (exists) {
      throw new ValidationError("Email already in use");
    }

    const role = roleInput === "owner" ? Role.owner : Role.customer;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // prisma.$transaction rolls back automatically if the callback throws
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await userRepository.create(
        { firstname, lastname, email, password: hashedPassword, role },
        tx
      );

      if (role === Role.owner) {
        if (!restaurantId) {
          throw new ValidationError("Restaurant is required for owner role");
        }

        const restaurant = await restaurantRepository.findById(restaurantId, tx);
        if (!restaurant) throw new NotFoundError("Restaurant not found");
        if (restaurant.ownerId) {
          throw new ValidationError("Restaurant already has an owner");
        }

        await restaurantRepository.assignOwner(restaurantId, newUser.id, tx);
      }

      return newUser;
    });

    return userOutputDTO(user);
  },

  /**
   * Lists restaurants that have no owner yet.
   *
   * @returns {Promise<RestaurantOutput[]>} Array of restaurant output DTOs
   */
  async listUnownedRestaurants(): Promise<RestaurantOutput[]> {
    const restaurants = await restaurantRepository.findUnowned();
    return restaurants.map(restaurantOutputDTO);
  },
};
