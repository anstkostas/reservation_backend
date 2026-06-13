/**
 * @swagger
 * tags:
 *   name: Restaurants
 *   description: Restaurant management
 */
import express from "express";
import { restaurantController } from "@/controllers/index.js";
import { validate, requireAuth, requireRole } from "@/middlewares/index.js";
import { idParamSchema, updateRestaurantSchema } from "@/validation/index.js";
import { Role } from "../generated/prisma/index.js";

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
 * /restaurants/me:
 *   get:
 *     summary: Get own restaurant (owner only)
 *     description: Returns the authenticated owner's restaurant in the private shape — includes address, phone, and description in both EN and EL locales.
 *     tags: [Restaurants]
 *     responses:
 *       200:
 *         description: Owner's restaurant in private shape
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RestaurantPrivate'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not an owner
 *       404:
 *         description: Owner has no restaurant
 */
// ⚠️ CRITICAL ORDERING: "/me" MUST be registered before "/:id".
// Express matches top-down; if "/:id" came first it would capture "me" as an id param.
router.get("/me", requireAuth, requireRole(Role.owner), restaurantController.getOwnRestaurant);

/**
 * @swagger
 * /restaurants/me:
 *   put:
 *     summary: Update own restaurant (owner only)
 *     description: Partially updates the authenticated owner's restaurant. Only provided fields are changed. EN description updates the canonical column; EL description is upserted as a translation row.
 *     tags: [Restaurants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRestaurantInput'
 *     responses:
 *       200:
 *         description: Updated restaurant in private shape
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RestaurantPrivate'
 *       400:
 *         description: Validation error (empty body or invalid field values)
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not an owner
 *       404:
 *         description: Owner has no restaurant
 */
router.put(
  "/me",
  requireAuth,
  requireRole(Role.owner),
  validate(updateRestaurantSchema),
  restaurantController.updateOwnRestaurant,
);

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
