import { Request, Response, NextFunction } from "express";
import { authService } from "../services/index.js";
import { sendResponse } from "../utils/index.js";
import { COOKIE_CONFIG } from "../config/env.js";
import { HTTP_STATUS, RESPONSE_MESSAGES } from "../constants/index.js";
import type { LoginInput, CreateUserInput } from "../validation/index.js";

export const authController = {
  /**
   * Authenticates a user and sets the auth cookie on success.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // req.body is validated and sanitized by the validate middleware before this runs
      const { user, token } = await authService.login(req.body as LoginInput);
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
   */
  async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
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
   */
  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, token } = await authService.signup(req.body as CreateUserInput);
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
   */
  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendResponse(res, req.user, HTTP_STATUS.OK, RESPONSE_MESSAGES.AUTH.USER_RETRIEVED);
    } catch (err) {
      next(err);
    }
  },
};
