const { Reservation } = require("../models/reservation.js");

module.exports = {
  async create(reservationData) {
    return Reservation.create(reservationData);
  },

  async findById(id) {
    return Reservation.findByPk(id);
  },

  async findAll(filter = {}) {
    const where = {};
    if (filter.restaurantId) where.restaurantId = filter.restaurantId;
    if (filter.customerId) where.customerId = filter.customerId;
    return Reservation.findAll({ where });
  },

  async update(id, updatedData) {
    const reservation = await Reservation.findByPk(id);
    if (!reservation) return null;
    return reservation.update(updatedData);
  },

  async delete(id) {
    const reservation = await Reservation.findByPk(id);
    if (!reservation) return null;
    await reservation.destroy();
    return reservation;
  },

  async count(filter = {}) {
    const where = {};
    if (filter.restaurantId) where.restaurantId = filter.restaurantId;
    if (filter.customerId) where.customerId = filter.customerId;
    return Reservation.count({ where });
  },
};
