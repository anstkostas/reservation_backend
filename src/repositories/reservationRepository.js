const { Reservation } = require("../models");

module.exports = {
  async create(reservationData, options = {}) {
    return Reservation.create(reservationData, options);
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

  async countActiveBySlot(restaurantId, date, time, options = {}) {
    return Reservation.count({
      where: {
        restaurantId,
        date,
        time,
        status: "active",
      },
      ...options,
    });
  },
};
