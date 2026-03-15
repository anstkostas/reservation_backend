const userDTO = require("./userDTO.js");
const { ValidationError } = require("../errors");

module.exports = {
  /**
   * Validates and normalizes login input.
   *
   * @param {object} data - Raw request body
   * @returns {{email: string, password: string}}
   * @throws {ValidationError} If email or password is missing
   */
  loginInputDTO(data) {
    if (!data.email || !data.password) {
      throw new ValidationError("Email and password are required");
    }
    return { email: data.email.trim().toLowerCase(), password: data.password };
  },

  /**
   * Validates signup input data.
   * @param {object} data - Raw request body
   * @returns {{email: string, password: string, firstname?: string, lastname?: string, restaurantId?: number}}
   * @throws {ValidationError} if required fields are missing
   */
  signupInputDTO(data) {
    const userData = userDTO.createUserInputDTO(data);
    if (!userData.email || !userData.password) {
      throw new ValidationError("Email and password are required");
    }
    return userData;
  },

  /**
   * Shapes the login/signup response — combines the safe user output DTO with the signed token.
   *
   * @param {object} user - User object from DB
   * @param {string} token - Signed JWT
   * @returns {{user: {id: string, firstname: string, lastname: string, email: string, role: string}, token: string}}
   */
  loginOutputDTO(user, token) {
    return {
      user: userDTO.userOutputDTO(user),
      token,
    };
  },
};
