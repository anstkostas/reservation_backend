// src/validation/reservationValidation.js
const Joi = require("joi");

const allowedStatus = ["active", "canceled", "completed"];

const createReservationSchema = Joi.object({
  date: Joi.date().required(),
  time: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required() // HH:mm 24h format
    .messages({
      "string.pattern.base": "Time must be in HH:mm format",
    }),
  persons: Joi.number().integer().positive().required(),
  status: Joi.string()
    .valid(...allowedStatus)
    .default("active"),
  restaurantId: Joi.string().uuid().required(),
  customerId: Joi.string().uuid().required(),
});

const updateReservationSchema = Joi.object({
  date: Joi.date(),
  time: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .messages({
      "string.pattern.base": "Time must be in HH:mm format",
    }),
  people: Joi.number().integer().positive(),
  status: Joi.string().valid(...allowedStatus),
  restaurantId: Joi.string().uuid(),
  customerId: Joi.string().uuid(),
});

module.exports = {
  createReservationSchema,
  updateReservationSchema,
};
