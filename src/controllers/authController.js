const { authDTO } = require("../dtos");
const { authService } = require("../services");
const { sendResponse } = require("../utils");

module.exports = {
  async login(req, res, next) {
    try {
      const input = authDTO.loginInputDTO(req.body);
      const { user, token } = await authService.login(input);
      res.cookie("accessToken", token, {
        httpOnly: true,
        sameSite: "lax", // adjust in prod if needed
        secure: false, // true in production
        maxAge: 1000 * 60 * 60, // 1 hour
      });
      const userData = authDTO.loginOutputDTO(user);
      sendResponse(res, { user: userData });
    } catch (err) {
      next(err);
    }
  },

  async signup(req, res, next) {
    try {
      const input = authDTO.signupInputDTO(req.body);
      const { user, token } = await authService.signup(input);
      res.cookie("accessToken", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 1000 * 60 * 60,
      });

      const userData = authDTO.loginOutputDTO(user);
      sendResponse(res, { user: userData }, 201, "User created and logged in");
    } catch (err) {
      next(err);
    }
  },
};
