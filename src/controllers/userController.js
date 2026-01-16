const { userService } = require("../services");
const { sendResponse } = require("../utils");

module.exports = {
  // ❌ No create user here...
  // endpoint is at authController, this controller handles authenticated user operations.

  /**
   * Lists restaurants that do not have an owner.
   *
   * @async
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @param {Function} next - The next middleware function.
   * @returns {Promise<void>}
   */
  async listUnownedRestaurants(req, res, next) {
    try {
      const restaurants = await userService.listUnownedRestaurants();
      return sendResponse(res, restaurants, 200, "Unowned restaurants fetched");
    } catch (err) {
      next(err);
    }
  },
};
