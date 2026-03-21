/**
 * @swagger
 * tags:
 *   name: Restaurants
 *   description: Restaurant management
 */
import express from "express";
import { restaurantController } from "../controllers/index.js";
import { validate } from "../middlewares/index.js";
import { idParamSchema } from "../validation/index.js";

const router = express.Router();

/**
 * @swagger
 * /restaurants:
 *   get:
 *     summary: List all restaurants
 *     description: Public endpoint to retrieve all registered restaurants
 *     tags: [Restaurants]
 *     security: []
 *     responses:
 *       200:
 *         description: List of restaurants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Restaurant'
 */
router.get("/", restaurantController.getAllRestaurants);

/**
 * @swagger
 * /restaurants/{id}:
 *   get:
 *     summary: Get restaurant details
 *     description: Public endpoint to get details of a specific restaurant
 *     tags: [Restaurants]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Restaurant details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Restaurant'
 *       404:
 *         description: Restaurant not found
 */
router.get("/:id", validate(idParamSchema, "params"), restaurantController.getRestaurantById);

export default router;
