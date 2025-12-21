const Joi = require("joi");

const createRestaurantSchema = Joi.object({
  name: Joi.string().min(4).max(100).required(),
  description: Joi.string().allow("").max(500),
  capacity: Joi.number().integer().positive().required(),
  logoUrl: Joi.string().uri().required(),
  coverImageUrl: Joi.string().uri().required(),
  ownerId: Joi.string().uuid(),
});

const updateRestaurantSchema = Joi.object({
  name: Joi.string().min(4).max(100),
  capacity: Joi.number().integer().positive().min(1),
  description: Joi.string().allow("").max(500),
  logoUrl: Joi.string().uri(),
  coverImageUrl: Joi.string().uri(),
  ownerId: Joi.string().uuid(),
});

module.exports = {
  createRestaurantSchema,
  updateRestaurantSchema,
};
