// Implement Java's DAO pattern
// Encapsulate access to db in a constant set of methods.
const { User } = require("../models");

module.exports = {
  async create(userData, options = {}) {
    return await User.create(userData, options);
  },

  async findById(id) {
    return User.findByPk(id);
  },

  async findByEmail(email) {
    return User.findOne({ where: { email } });
  },

  async findAll(filter = {}) {
    const where = {};
    if (filter.role) where.role = filter.role;
    return User.findAll({ where });
  },

  async update(id, updatedData) {
    const user = await User.findByPk(id);
    if (!user) return null;
    return user.update(updatedData);
  },

  async delete(id) {
    const user = await User.findByPk(id);
    if (!user) return null;
    await user.destroy();
    return user;
  },

  async count(filter = {}) {
    const where = {};
    if (filter.role) where.role = filter.role;
    return User.count({ where });
  },
};
