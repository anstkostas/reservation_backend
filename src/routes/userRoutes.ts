import express from "express";
import { userController } from "../controllers/index.js";

const router = express.Router();

/**
 * @swagger
 * /users/unowned-restaurants:
 *   get:
 *     tags:
 *       - Users
 *     summary: List unowned restaurants
 *     description: >
 *       Returns all restaurants that do not have an owner assigned.
 *       Public endpoint — used during signup to allow new owners to claim
 *       a restaurant before they have an account.
 *     security: []
 *     responses:
 *       200:
 *         description: Unowned restaurants fetched successfully
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
router.get("/unowned-restaurants", userController.listUnownedRestaurants);

export default router;
