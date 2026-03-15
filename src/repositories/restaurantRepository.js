const { Restaurant } = require("../models");

module.exports = {
  /**
   * Finds a single restaurant by primary key.
   *
   * @async
   * @param {string} id - Restaurant UUID
   * @param {object} [options={}] - Sequelize options (e.g. transaction, lock)
   * @returns {Promise<Restaurant|null>} The restaurant instance, or null if not found
   */
  async findById(id, options = {}) {
    return Restaurant.findByPk(id, options);
  },

  /**
   * Finds all restaurants.
   *
   * @async
   * @returns {Promise<Restaurant[]>} Array of all restaurant instances
   */
  async findAll() {
    return Restaurant.findAll();
  },

  /**
   * Finds all restaurants with no owner assigned.
   *
   * @async
   * @returns {Promise<Restaurant[]>} Restaurants where ownerId is null
   */
  async findUnowned() {
    return Restaurant.findAll({ where: { ownerId: null } });
  },

  /**
   * Finds the restaurant owned by a specific user.
   *
   * @async
   * @param {string} ownerId - Owner's user UUID
   * @returns {Promise<Restaurant|null>} The restaurant instance, or null if none found
   */
  async findByOwnerId(ownerId) {
    return Restaurant.findOne({ where: { ownerId } });
  },

  /**
   * Assigns a user as the owner of a restaurant.
   *
   * @async
   * @param {string} id - Restaurant UUID
   * @param {string} ownerId - User UUID to assign as owner
   * @param {object} [options={}] - Sequelize options (e.g. transaction)
   * @returns {Promise<Restaurant|null>} The updated restaurant instance, or null if not found
   */
  async assignOwner(id, ownerId, options = {}) {
    const restaurant = await Restaurant.findByPk(id, options);
    if (!restaurant) return null;
    return restaurant.update({ ownerId }, options);
  },
};
