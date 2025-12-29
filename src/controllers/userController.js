const { userService } = require("../services");
const { sendResponse } = require("../utils");

module.exports = {
  // ❌ No create user here...
  // endpoint is at authController, this controller handles authenticated user operations.

  async updateUser(req, res, next) {
    try {
      const userId = req.params.id;
      const updatedUser = await userService.updateUser(userId, req.body);
      sendResponse(res, updatedUser);
    } catch (err) {
      next(err);
    }
  },

  async getUserById(req, res, next) {
    try {
      const userId = req.params.id;
      console.log("userId");
      console.log(userId);
      const user = await userService.getUserById(userId);
      sendResponse(res, user);
    } catch (err) {
      next(err);
    }
  },

  async getUserByEmail(req, res, next) {
    try {
      const user = await userService.getUserByEmail(req.params.email);
      return sendResponse(res, user);
    } catch (err) {
      next(err);
    }
  },

  async listUnownedRestaurants(req, res, next) {
    try {
      const restaurants = await userService.listUnownedRestaurants();
      return sendResponse(res, restaurants, 200, "Unowned restaurants fetched");
    } catch (err) {
      next(err);
    }
  },
};
