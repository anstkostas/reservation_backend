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
});

const updateUserSchema = Joi.object({
  email: Joi.string().email(),
  password: Joi.string().pattern(passwordPattern).messages({
    "string.pattern.base":
      "Password must be at least 8 characters, include uppercase, lowercase, number, and special character",
  }),
  firstname: Joi.string().min(4).max(50),
  lastname: Joi.string().min(4).max(50),
  role: Joi.string().valid("owner", "customer").required(),
}).min(1);

module.exports = {
  createUserSchema,
  updateUserSchema,
};
