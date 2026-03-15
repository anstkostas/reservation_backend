const { authDTO } = require("../dtos");
const { authService } = require("../services");
const { sendResponse } = require("../utils");
const { COOKIE_CONFIG } = require("../config/env.js");
const { HTTP_STATUS, RESPONSE_MESSAGES } = require("../constants");

module.exports = {
  /**
   * Authenticates a user and sets the auth cookie on success.
   *
   * @async
   * @throws {ValidationError} If credentials are missing or invalid
   */
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
      sendResponse(res, user, HTTP_STATUS.OK, RESPONSE_MESSAGES.AUTH.LOGIN_SUCCESS);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Logs out a user by clearing the authentication cookie.
   *
   * @async
   */
  async logout(_req, res, next) {
    try {
      res.clearCookie(COOKIE_CONFIG.NAME, {
        httpOnly: COOKIE_CONFIG.HTTP_ONLY,
        secure: COOKIE_CONFIG.SECURE,
        sameSite: COOKIE_CONFIG.SAME_SITE,
      });

      sendResponse(res, null, HTTP_STATUS.OK, RESPONSE_MESSAGES.AUTH.LOGOUT_SUCCESS);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Creates a new user account and sets the auth cookie on success.
   *
   * @async
   * @throws {ValidationError} If required fields are missing or email is already in use
   */
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
      sendResponse(res, user, HTTP_STATUS.CREATED, RESPONSE_MESSAGES.AUTH.SIGNUP_SUCCESS);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Returns the currently authenticated user from the request context.
   * req.user is populated by the requireAuth middleware.
   *
   * @async
   */
  async getCurrentUser(req, res, next) {
    try {
      sendResponse(res, req.user, HTTP_STATUS.OK, RESPONSE_MESSAGES.AUTH.USER_RETRIEVED);
    } catch (err) {
      next(err);
    }
  },
};
