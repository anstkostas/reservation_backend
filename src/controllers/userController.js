const { userService } = require("../services");
const { sendResponse } = require("../utils");
const { HTTP_STATUS, RESPONSE_MESSAGES } = require("../constants");

module.exports = {
  // ❌ No create user here...
  // endpoint is at authController, this controller handles authenticated user operations.

  /**
   * Lists restaurants that do not have an owner.
   *
   * @async
   */
  async listUnownedRestaurants(_req, res, next) {
    try {
      const restaurants = await userService.listUnownedRestaurants();
      return sendResponse(res, restaurants, HTTP_STATUS.OK, RESPONSE_MESSAGES.RESTAURANT.LIST_RETRIEVED);
    } catch (err) {
      next(err);
    }
  },
};
