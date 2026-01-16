const express = require("express");
const { userController } = require("../controllers");
const { requireAuth } = require("../middlewares");

const router = express.Router();

/**
 * @swagger
 * /users/unowned-restaurants:
 *   get:
 *     tags:
 *       - Users
 *     summary: List unowned restaurants
 *     description: Returns all restaurants that do not have an owner assigned
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Unowned restaurants fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Restaurant'
 *       401:
 *         description: Missing or invalid authorization token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/unowned-restaurants", userController.listUnownedRestaurants);

module.exports = router;
