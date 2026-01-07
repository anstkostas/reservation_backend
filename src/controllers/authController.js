const { authDTO } = require("../dtos");
const { authService } = require("../services");
const { sendResponse } = require("../utils");
const { COOKIE_CONFIG } = require("../config/env.js");

module.exports = {
  async login(req, res, next) {
    try {
      const input = authDTO.loginInputDTO(req.body);
      const { user, token } = await authService.login(input);
      res.cookie(COOKIE_CONFIG.NAME, token, {
        httpOnly: COOKIE_CONFIG.HTTP_ONLY,
        secure: COOKIE_CONFIG.SECURE,
        sameSite: COOKIE_CONFIG.SAME_SITE,
        maxAge: COOKIE_CONFIG.MAX_AGE,
      });
      const userData = authDTO.loginOutputDTO(user);
      sendResponse(res, { user: userData });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      res.clearCookie(COOKIE_CONFIG.NAME, {
        httpOnly: COOKIE_CONFIG.HTTP_ONLY,
        secure: COOKIE_CONFIG.SECURE,
        sameSite: COOKIE_CONFIG.SAME_SITE,
      });

      sendResponse(res, null, 200, "Logged out successfully");
    } catch (err) {
      next(err);
    }
  },

  async signup(req, res, next) {
    try {
      const input = authDTO.signupInputDTO(req.body);
      const { user, token } = await authService.signup(input);
      res.cookie(COOKIE_CONFIG.NAME, token, {
        httpOnly: COOKIE_CONFIG.HTTP_ONLY,
        secure: COOKIE_CONFIG.SECURE,
        sameSite: COOKIE_CONFIG.SAME_SITE,
        maxAge: COOKIE_CONFIG.MAX_AGE,
      });
      const userData = authDTO.loginOutputDTO(user);
      sendResponse(res, { user: userData }, 201, "User created and logged in");
    } catch (err) {
      next(err);
    }
  },
};
