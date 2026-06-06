import { Request, Response, NextFunction } from "express";
import { restaurantService } from "@/services/index.js";
import { sendResponse, resolveLocale } from "@/utils/index.js";
import { HTTP_STATUS, RESPONSE_MESSAGES } from "@/constants/index.js";

export const restaurantController = {
  /**
   * Returns all restaurants, descriptions localised via the Accept-Language header.
   */
  async getAllRestaurants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const locale = resolveLocale(req.headers["accept-language"]);
      const restaurants = await restaurantService.getAllRestaurants(locale);
      sendResponse(res, restaurants, HTTP_STATUS.OK, RESPONSE_MESSAGES.RESTAURANT.LIST_RETRIEVED);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Returns a single restaurant by ID, description localised via the Accept-Language header.
   */
  async getRestaurantById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const locale = resolveLocale(req.headers["accept-language"]);
      const restaurant = await restaurantService.getRestaurantById(id, locale);
      sendResponse(res, restaurant, HTTP_STATUS.OK, RESPONSE_MESSAGES.RESTAURANT.RETRIEVED);
    } catch (err) {
      next(err);
    }
  },
};
