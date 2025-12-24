const bcrypt = require("bcrypt");
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

  async createUser(data) {
    const createDTO = userDTO.createUserInputDTO(data);
    const exists = await userRepository.findByEmail(createDTO.email);
    if (exists) {
      throw new ValidationError("Email already in use", [
        { field: "email", message: "Email already in use" },
      ]);
    }
    createDTO.password = await bcrypt.hash(createDTO.password, 10);
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
        createDTO.restaurantId
      );
      if (!restaurant) throw new NotFoundError("Restaurant not found");
      if (restaurant.ownerId)
        throw new ValidationError("Restaurant already has an owner");

      await restaurantRepository.update(createDTO.restaurantId, {
        ownerId: createDTO.id,
      });
    }
    try {
      // Wrap only input directly related calls to the db with this error. For example completeReservation should be like this bc if Sequelize throws error it wouldnt be a Validation so with this method I would mask it as one.
      const user = await userRepository.create(createDTO);
      return userDTO.userOutputDTO(user);
    } catch (err) {
      if (err.name === "SequelizeValidationError") {
        throw ValidationError.fromSequelize(err);
      }
      throw err;
    }
  },

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
