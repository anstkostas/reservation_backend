const bcrypt = require("bcrypt");
const userRepository = require("../repositories/userRepository.js");
const restaurantRepository = require("../repositories/RestaurantRepository.js");
const userDTO = require("../dtos/userDTO.js");

// Object Literal Pattern
module.exports = {
  async createUser(data) {
    const createDTO = userDTO.createUserInputDTO(data);
    const exists = await userRepository.findByEmail(createDTO.email);
    if (exists) {
      throw Error("Email already in use"); // Later add http response type
    }
    createDTO.password = await bcrypt.hash(createDTO.password, 10);
    // Owner assignment logic
    if (createDTO.role === "owner") {
      if (!createDTO.restaurantId) {
        throw new Error("Owner must select a restaurant");
      }

      const restaurant = await restaurantRepository.findById(
        createDTO.restaurantId
      );
      if (!restaurant) throw new Error("Restaurant not found");
      if (restaurant.ownerId)
        throw new Error("Restaurant already has an owner");

      await restaurantRepository.update(createDTO.restaurantId, {
        ownerId: createDTO.id,
      });
    }
    const user = await userRepository.create(createDTO);
    return userDTO.userOutputDTO(user);
  },

  async updateUser(id, data) {
    const updateDTO = userDTO.updateUserInputDTO(data);
    // Check DTO if empty bc data could only have invalid fields.
    if (Object.keys(updateDTO).length === 0) {
      throw new Error("No fields to update");
    }
    if (updateDTO.email) {
      const exists = await userRepository.findByEmail(updateDTO.email);
      if (exists && exists.id !== id) {
        throw new Error("Email already in use");
      }
    }
    if ("customerId" in updateDTO || "restaurantId" in updateDTO) {
      throw new Error("Cannot modify reservation ownership");
    }

    if (updateDTO.password) {
      updateDTO.password = await bcrypt.hash(updateDTO.password, 10);
    }
    const updated = await userRepository.update(id, updateDTO);
    if (!updated) {
      throw new Error("User not found");
    }
    return userDTO.userOutputDTO(updated);
  },

  // Will be used to display no owned restaurants to be selected by users.
  async listUnownedRestaurants() {
    return (await restaurantRepository.findAll()).filter((r) => !r.ownerId);
  },
};
