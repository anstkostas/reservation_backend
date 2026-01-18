const Joi = require("joi");

const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().pattern(passwordPattern).required().messages({
    "string.pattern.base":
      "Password must be at least 8 characters, include uppercase, lowercase, number, and special character",
  }),
  firstname: Joi.string().min(4).max(50).required(),
  lastname: Joi.string().min(4).max(50).required(),
  role: Joi.string().valid("owner", "customer").required(),
  restaurantId: Joi.string().uuid().allow(null, ""),
});

module.exports = {
  createUserSchema,
};
