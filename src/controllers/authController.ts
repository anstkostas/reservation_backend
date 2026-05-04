import { Request, Response, NextFunction } from "express";
import { authService } from "../services/index.js";
import { sendResponse } from "../utils/index.js";
import { getAuthUser } from "../middlewares/index.js";
import { COOKIE_CONFIG, REFRESH_COOKIE_CONFIG } from "../config/env.js";
import { HTTP_STATUS, RESPONSE_MESSAGES } from "../constants/index.js";
import { NotAuthenticatedError } from "../errors/index.js";
import type { LoginInput, CreateUserInput } from "../validation/index.js";

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(COOKIE_CONFIG.NAME, accessToken, {
    httpOnly: COOKIE_CONFIG.HTTP_ONLY,
    secure: COOKIE_CONFIG.SECURE,
    sameSite: COOKIE_CONFIG.SAME_SITE,
    maxAge: COOKIE_CONFIG.MAX_AGE,
  });
  res.cookie(REFRESH_COOKIE_CONFIG.NAME, refreshToken, {
    httpOnly: REFRESH_COOKIE_CONFIG.HTTP_ONLY,
    secure: REFRESH_COOKIE_CONFIG.SECURE,
    sameSite: REFRESH_COOKIE_CONFIG.SAME_SITE,
    maxAge: REFRESH_COOKIE_CONFIG.MAX_AGE,
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(COOKIE_CONFIG.NAME, {
    httpOnly: COOKIE_CONFIG.HTTP_ONLY,
    secure: COOKIE_CONFIG.SECURE,
    sameSite: COOKIE_CONFIG.SAME_SITE,
  });
  res.clearCookie(REFRESH_COOKIE_CONFIG.NAME, {
    httpOnly: REFRESH_COOKIE_CONFIG.HTTP_ONLY,
    secure: REFRESH_COOKIE_CONFIG.SECURE,
    sameSite: REFRESH_COOKIE_CONFIG.SAME_SITE,
  });
}

export const authController = {
  /**
   * Authenticates a user and sets both auth cookies on success.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // req.body is validated and sanitized by the validate middleware before this runs
      const { user, tokens } = await authService.login(req.body as LoginInput);
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
      sendResponse(res, user, HTTP_STATUS.OK, RESPONSE_MESSAGES.AUTH.LOGIN_SUCCESS);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Logs out a user by clearing both auth cookies and invalidating all active sessions in the DB.
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.logout(getAuthUser(req).id);
      clearAuthCookies(res);
      sendResponse(res, null, HTTP_STATUS.OK, RESPONSE_MESSAGES.AUTH.LOGOUT_SUCCESS);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Creates a new user account and sets both auth cookies on success.
   */
  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, tokens } = await authService.signup(req.body as CreateUserInput);
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
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
      sendResponse(res, getAuthUser(req), HTTP_STATUS.OK, RESPONSE_MESSAGES.AUTH.USER_RETRIEVED);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Issues new access and refresh tokens using the refresh token cookie.
   * Rotates the refresh token — the old token is invalidated immediately.
   * No requireAuth on this route — the refresh cookie IS the credential.
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken: string | undefined = req.cookies[REFRESH_COOKIE_CONFIG.NAME];
      if (!rawRefreshToken) {
        return next(new NotAuthenticatedError("No refresh token provided"));
      }

      const { user, tokens } = await authService.refresh(rawRefreshToken);
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
      sendResponse(res, user, HTTP_STATUS.OK, RESPONSE_MESSAGES.AUTH.REFRESH_SUCCESS);
    } catch (err) {
      next(err);
    }
  },
};
