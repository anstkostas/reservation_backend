const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { userRepository } = require("../repositories");
const { ValidationError } = require("../errors");
const { AUTH_CONFIG } = require("../config/env.js");
const { authDTO } = require("../dtos");
const userService = require("./userService.js");

module.exports = {
  /**
   * Authenticates a user and returns a signed JWT alongside the user output DTO.
   *
   * @async
   * @param {{ email: string, password: string }} data - Normalized login credentials
   * @returns {Promise<{ user: object, token: string }>} Login output DTO with user and token
   * @throws {ValidationError} If email is not found or password does not match
   */
  async login(data) {
    const { email, password } = data;
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new ValidationError("Invalid email or password");
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new ValidationError("Invalid email or password");
    }

    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(payload, AUTH_CONFIG.JWT_SECRET, {
      expiresIn: AUTH_CONFIG.JWT_EXPIRES_IN,
    });
    return authDTO.loginOutputDTO(user, token);
  },

  /**
   * Signs up a new user.
   *
   * @async
   * @param {Object} data - The signup data.
   * @returns {Promise<Object>} The login output DTO containing the newly created user and token.
   */
  async signup(data) {
    const user = await userService.createUser(data);

    const payload = {
      id: user.id,
      role: user.role,
    };

    const token = jwt.sign(payload, AUTH_CONFIG.JWT_SECRET, {
      expiresIn: AUTH_CONFIG.JWT_EXPIRES_IN,
    });

    return authDTO.loginOutputDTO(user, token);
  },
};
