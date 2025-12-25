const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { userRepository } = require("../repositories");
const { ValidationError } = require("../errors");
const { AUTH_LOGIN } = require("../config/env");
const { loginOutputDTO } = require("../dtos");

module.exports = {
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
    const token = jwt.sign(payload, AUTH_LOGIN.JWT_SECRET, {
      expiresIn: AUTH_LOGIN.JWT_EXPIRES_IN,
    });

    return loginOutputDTO(user, token);
  },
};
