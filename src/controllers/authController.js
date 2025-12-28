const { authDTO } = require("../dtos");
const { authService } = require("../services");
const { sendResponse } = require("../utils");

module.exports = {
  async login(req, res, next) {
    try {
      const input = authDTO.loginInputDTO(req.body);
      const result = await authService.login(input);
      sendResponse(res, result);
    } catch (err) {
      next(err);
    }
  },

  async signup(req, res, next) {
    try {
      const input = authDTO.signupInputDTO(req.body);
      const result = await authService.signup(input);
      sendResponse(res, result, 201, "User created and logged in");
    } catch (err) {
      next(err);
    }
  },
};
