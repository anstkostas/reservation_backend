const Joi = require("joi");

const createReservationSchema = Joi.object({
  date: Joi.date().required(),
  time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .required(),
  persons: Joi.number().integer().min(1).required(),
});

const updateReservationSchema = Joi.object({
  date: Joi.date(),
  time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
  persons: Joi.number().integer().min(1),
}).min(1);

const reservationStatusSchema = Joi.object({
  status: Joi.string().valid("completed", "no-show").required(),
});

module.exports = {
  createReservationSchema,
  updateReservationSchema,
  reservationStatusSchema
};
