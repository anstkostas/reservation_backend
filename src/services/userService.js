const bcrypt = require("bcryptjs");
const { sequelize } = require("../models");
const { userRepository, restaurantRepository } = require("../repositories");
const { userDTO, restaurantDTO } = require("../dtos");
const { NotFoundError, ValidationError, ForbiddenError } = require("../errors");

// Object Literal Pattern
module.exports = {
  /**
   * Creates a new user and (optionally) assigns restaurant ownership.
   *
   * IMPORTANT:
   * This operation is TRANSACTIONAL.
   *
   * Reason:
   * Creating a user and assigning a restaurant owner are a single business action.
   * If either step fails, the database MUST remain unchanged.
   *
   * Transaction guarantees:
   * - User is not created unless owner assignment also succeeds
   * - Restaurant is not modified unless user creation succeeds
   * - Prevents inconsistent states (e.g. user exists but restaurant unowned)
   *
   * Business rules enforced:
   * - Email must be unique
   * - Password is hashed before persistence
   * - Role is immutable after creation
   * - Owners must select a restaurant
   * - Each restaurant may have only one owner
   *
   * Error handling:
   * - Business and authorization errors are thrown explicitly
   * - SequelizeValidationError is caught ONLY to normalize validation output
   * - All other errors are rethrown to preserve semantics
   *
   * @param {Object} data - Raw user input data
   * @returns {Promise<Object>} User output DTO
   * @throws {ValidationError} If input or business rules are violated
   * @throws {NotFoundError} If restaurant does not exist
   */
  async createUser(data) {
    const createDTO = userDTO.createUserInputDTO(data);
    const exists = await userRepository.findByEmail(createDTO.email);
    if (exists) {
      throw new ValidationError("Email already in use", [
        { field: "email", message: "Email already in use" },
      ]);
    }
    createDTO.role = createDTO.restaurantId ? "owner" : "customer";
    createDTO.password = await bcrypt.hash(createDTO.password, 10);
    const transaction = await sequelize.transaction();
    try {
      const user = await userRepository.create(createDTO, { transaction });
      // Owner assignment logic
      if (createDTO.role === "owner") {
        if (!createDTO.restaurantId) {
          throw new ValidationError("Owner must select a restaurant", [
            {
              field: "restaurantId",
              message: "Restaurant is required for owner role",
            },
          ]);
        }

        const restaurant = await restaurantRepository.findById(
          createDTO.restaurantId,
          { transaction }
        );
        if (!restaurant) throw new NotFoundError("Restaurant not found");
        if (restaurant.ownerId)
          throw new ValidationError("Restaurant already has an owner");

        await restaurantRepository.assignOwner(
          createDTO.restaurantId,
          user.id,
          { transaction }
        );
      }
      await transaction.commit();
      return userDTO.userOutputDTO(user);
    } catch (err) {
      await transaction.rollback();
      if (err.name === "SequelizeValidationError") {
        throw ValidationError.fromSequelize(err);
      }
      throw err;
    }
  },

  /**
   * Lists restaurants that have no owner yet.
   * @returns {Promise<Array>} Array of restaurant output DTOs
   */
  async listUnownedRestaurants() {
    const allRestaurants = await restaurantRepository.findAll();
    const unowned = allRestaurants.filter((r) => !r.ownerId);
    return unowned.map((r) => restaurantDTO.restaurantOutputDTO(r));
  },
};
