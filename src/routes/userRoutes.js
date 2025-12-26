const express = require("express");
const { userController } = require("../controllers");
const { requireAuth } = require("../middlewares");

const router = express.Router();

router.get(
  "/unowned-restaurants",
  requireAuth,
  userController.listUnownedRestaurants
);
router.get("/:id", requireAuth, userController.getUserById);
router.get("/email/:email", requireAuth, userController.getUserByEmail);
router.put("/:id", requireAuth, userController.updateUser);

module.exports = router;
