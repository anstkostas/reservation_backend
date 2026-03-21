import { Request, Response, NextFunction } from "express";
import { restaurantService } from "../services/index.js";
import { sendResponse } from "../utils/index.js";
import { HTTP_STATUS, RESPONSE_MESSAGES } from "../constants/index.js";

export const restaurantController = {
  /**
   * Returns all restaurants.
   */
  async getAllRestaurants(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurants = await restaurantService.getAllRestaurants();
      sendResponse(res, restaurants, HTTP_STATUS.OK, RESPONSE_MESSAGES.RESTAURANT.LIST_RETRIEVED);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Returns a single restaurant by ID.
   */
  async getRestaurantById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const restaurant = await restaurantService.getRestaurantById(id);
      sendResponse(res, restaurant, HTTP_STATUS.OK, RESPONSE_MESSAGES.RESTAURANT.RETRIEVED);
    } catch (err) {
      next(err);
    }
  },
};
