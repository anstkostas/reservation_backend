const { Reservation, Restaurant, User } = require("../models");

module.exports = {
  /**
   * Creates a new reservation record.
   *
   * @async
   * @param {object} reservationData - Fields for the new reservation
   * @param {object} [options={}] - Sequelize options (e.g. transaction)
   * @returns {Promise<Reservation>} The created reservation instance
   */
  async create(reservationData, options = {}) {
    return Reservation.create(reservationData, options);
  },

  /**
   * Finds a single reservation by primary key.
   *
   * @async
   * @param {string} id - Reservation UUID
   * @param {object} [options={}] - Sequelize options (e.g. transaction, lock)
   * @returns {Promise<Reservation|null>} The reservation instance, or null if not found
   */
  async findById(id, options = {}) {
    return Reservation.findByPk(id, options);
  },

  /**
   * Finds all reservations matching the given filter, with restaurant and customer joined.
   *
   * @async
   * @param {object} [filter={}] - Optional filter fields: restaurantId, customerId, status
   * @returns {Promise<Reservation[]>} Array of reservation instances ordered by date/time descending
   */
  async findAll(filter = {}) {
    const where = {};
    if (filter.restaurantId) where.restaurantId = filter.restaurantId;
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.status) where.status = filter.status;

    return Reservation.findAll({
      where,
      include: [
        { model: Restaurant, as: 'restaurant', attributes: ['name', 'id', 'address', 'phone'] },
        { model: User, as: 'customer', attributes: ['id', 'firstname', 'lastname', 'email'] }
      ],
      order: [['date', 'DESC'], ['time', 'DESC']]
    });
  },

  /**
   * Updates a reservation by ID with the provided data.
   *
   * @async
   * @param {string} id - Reservation UUID
   * @param {object} updatedData - Fields to update
   * @param {object} [options={}] - Sequelize options (e.g. transaction) — must be forwarded
   *   when called within a transaction to ensure the write is part of the same atomic operation
   * @returns {Promise<Reservation|null>} The updated reservation instance, or null if not found
   */
  async update(id, updatedData, options = {}) {
    const reservation = await this.findById(id, options);
    if (!reservation) return null;
    return reservation.update(updatedData, options);
  },

  /**
   * Deletes a reservation by ID.
   *
   * @async
   * @param {string} id - Reservation UUID
   * @param {object} [options={}] - Sequelize options (e.g. transaction)
   * @returns {Promise<Reservation|null>} The deleted reservation instance, or null if not found
   */
  async delete(id, options = {}) {
    const reservation = await this.findById(id, options);
    if (!reservation) return null;
    await reservation.destroy(options);
    return reservation;
  },

  /**
   * Counts reservations matching the given filter.
   *
   * @async
   * @param {object} [filter={}] - Optional filter fields: restaurantId, customerId
   * @returns {Promise<number>} Total count of matching reservations
   */
  async count(filter = {}) {
    const where = {};
    if (filter.restaurantId) where.restaurantId = filter.restaurantId;
    if (filter.customerId) where.customerId = filter.customerId;
    return Reservation.count({ where });
  },

  /**
   * Counts active reservations for a specific restaurant, date, and time slot.
   * Used to check capacity before creating or updating a reservation.
   *
   * @async
   * @param {string} restaurantId - Restaurant UUID
   * @param {string} date - Reservation date (DATEONLY format)
   * @param {string} time - Reservation time (TIME format)
   * @param {object} [options={}] - Sequelize options (e.g. transaction, lock) — pass
   *   LOCK.UPDATE when called within a capacity-check transaction to prevent race conditions
   * @returns {Promise<number>} Count of active reservations for that slot
   */
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
