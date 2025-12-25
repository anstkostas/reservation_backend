const bcrypt = require("bcrypt");
const { sequelize } = require("../models");
const { userRepository, restaurantRepository } = require("../repositories");
const { userDTO } = require("../dtos");
const { NotFoundError, ValidationError, ForbiddenError } = require("../errors");

// Object Literal Pattern
module.exports = {
  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  },

  async getUserByEmail(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  },

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

        await restaurantRepository.update(
          createDTO.restaurantId,
          {
            ownerId: user.id,
          },
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
   * Updates mutable user fields.
   *
   * IMPORTANT:
   * This method intentionally uses a MINIMAL try/catch block.
   *
   * Reason:
   * - Only Sequelize validation errors should be normalized
   * - Business logic errors must NOT be masked or reclassified
   * - Masking errors here would break global error handling semantics
   *
   * Business rules enforced:
   * - Only whitelisted fields may be updated
   * - Email uniqueness is revalidated
   * - Password is rehashed if updated
   * - Ownership and foreign keys are immutable
   *
   * Error handling:
   * - No transaction is required (single write operation)
   * - SequelizeValidationError is normalized
   * - All other errors propagate unchanged
   *
   * @param {number} id - User identifier
   * @param {Object} data - Partial update payload
   * @returns {Promise<Object>} Updated user output DTO
   * @throws {ValidationError} If no valid fields or uniqueness violated
   * @throws {ForbiddenError} If attempting to modify immutable fields
   * @throws {NotFoundError} If user does not exist
   */
  async updateUser(id, data) {
    const updateDTO = userDTO.updateUserInputDTO(data);
    // Check DTO if empty bc data could only have invalid fields.
    if (Object.keys(updateDTO).length === 0) {
      throw new ValidationError("No fields to update");
    }
    if (updateDTO.email) {
      const exists = await userRepository.findByEmail(updateDTO.email);
      if (exists && exists.id !== id) {
        throw new ValidationError("Email already in use", [
          { field: "email", message: "Email already in use" },
        ]);
      }
    }
    if ("customerId" in updateDTO || "restaurantId" in updateDTO) {
      throw new ForbiddenError("Cannot modify reservation ownership");
    }

    if (updateDTO.password) {
      updateDTO.password = await bcrypt.hash(updateDTO.password, 10);
    }

    try {
      // Wrap only input directly related calls to the db with this error. For example completeReservation shouldn't have this bc if Sequelize throws error it wouldnt be a Validation so with this method I would mask it as one.
      const updated = await userRepository.update(id, updateDTO);
      if (!updated) {
        throw new NotFoundError("User not found");
      }

      return userDTO.userOutputDTO(updated);
    } catch (err) {
      if (err.name === "SequelizeValidationError") {
        throw ValidationError.fromSequelize(err);
      }
      throw err;
    }
  },

  // Will be used to display no owned restaurants to be selected by users.
  async listUnownedRestaurants() {
    return (await restaurantRepository.findAll()).filter((r) => !r.ownerId);
  },
};
