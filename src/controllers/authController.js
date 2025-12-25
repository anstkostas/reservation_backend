const { loginInputDTO } = require("../dtos");
const { authService } = require("../services");
const { sendResponse } = require("../utils");

module.exports = {
  async login(req, res, next) {
    try {
      const input = loginInputDTO(req.body);
      const result = await authService.login(input);
      sendResponse(res, result);
    } catch (err) {
      next(err);
    }
  },
};
