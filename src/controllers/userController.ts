import { Request, Response, NextFunction } from "express";
import { userService } from "../services/index.js";
import { sendResponse } from "../utils/index.js";
import { HTTP_STATUS, RESPONSE_MESSAGES } from "../constants/index.js";

export const userController = {
  // No create user here — account creation is handled by authController.
  // This controller handles user-scoped operations that don't involve auth flow.

  /**
   * Lists restaurants that do not have an owner assigned.
   * Used in the signup flow before the user account exists.
   */
  async listUnownedRestaurants(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurants = await userService.listUnownedRestaurants();
      sendResponse(res, restaurants, HTTP_STATUS.OK, RESPONSE_MESSAGES.RESTAURANT.LIST_RETRIEVED);
    } catch (err) {
      next(err);
    }
  },
};
