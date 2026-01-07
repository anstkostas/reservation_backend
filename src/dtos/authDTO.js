const userDTO = require("./userDTO.js");
const { ValidationError } = require("../errors");

module.exports = {
  /**
   * Validates login input
   * @param {object} data
   * @returns {{email: string, password: string}}
   */
  loginInputDTO(data) {
    if (!data.email || !data.password) {
      throw new ValidationError("Email and password are required");
    }
    return { email: data.email, password: data.password };
  },

  /**
   * Validates signup input data.
   * @param {object} data - Raw request body
   * @returns {{email: string, password: string, name?: string, restaurantId?: number}}
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
   * Standardizes login output
   * @param {object} user - user object from DB
   * @returns {{user: {id: number, firstname:string, lastname:string, email: string, role: string}}}
   */
  loginOutputDTO(user) {
    return {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
    };
  },
};
