import jwt from "jsonwebtoken";
import ms from "ms";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { userRepository, refreshTokenRepository } from "../repositories/index.js";
import { ValidationError, NotAuthenticatedError } from "../errors/index.js";
import { AUTH_CONFIG, REFRESH_AUTH_CONFIG } from "../config/env.js";
import { userOutputDTO, type LoginServiceOutput, type AuthTokens } from "../dtos/index.js";
import type { LoginInput, CreateUserInput } from "../validation/index.js";
import { userService } from "./userService.js";

/**
 * Signs both access and refresh tokens, persists the refresh token hash to the DB,
 * and returns the token pair with its expiry date.
 *
 * @param {string} userId - Owner of the tokens
 * @param {string} role - User role, embedded in the access token payload
 * @returns {Promise<AuthTokens>}
 */
async function generateTokens(userId: string, role: string): Promise<AuthTokens> {
  const accessToken = jwt.sign(
    { id: userId, role },
    AUTH_CONFIG.JWT_SECRET,
    { expiresIn: AUTH_CONFIG.JWT_EXPIRES_IN as ms.StringValue },
  );

  const rawRefreshToken = jwt.sign(
    { id: userId },
    REFRESH_AUTH_CONFIG.REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_AUTH_CONFIG.REFRESH_TOKEN_EXPIRES_IN as ms.StringValue },
  );

  const familyId = uuidv4();
  const expiresAt = new Date(Date.now() + ms(REFRESH_AUTH_CONFIG.REFRESH_TOKEN_EXPIRES_IN as ms.StringValue));

  await refreshTokenRepository.create(rawRefreshToken, userId, familyId, expiresAt);

  return { accessToken, refreshToken: rawRefreshToken, refreshTokenExpiresAt: expiresAt };
}

export const authService = {
  /**
   * Authenticates a user and returns a token pair alongside the user output DTO.
   *
   * @param {LoginInput} data - Validated login credentials
   * @returns {Promise<LoginServiceOutput>} User DTO and signed access + refresh tokens
   * @throws {ValidationError} If email is not found or password does not match
   */
  async login(data: LoginInput): Promise<LoginServiceOutput> {
    const { email, password } = data;

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new ValidationError("Invalid email or password");
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new ValidationError("Invalid email or password");
    }

    const tokens = await generateTokens(user.id, user.role);
    return { user: userOutputDTO(user), tokens };
  },

  /**
   * Signs up a new user and returns a token pair alongside the user output DTO.
   *
   * @param {CreateUserInput} data - Validated signup data
   * @returns {Promise<LoginServiceOutput>} User DTO and signed access + refresh tokens
   * @throws {ValidationError} If email is taken or owner business rules are violated — bubbled from userService.createUser
   * @throws {NotFoundError} If the claimed restaurant does not exist — bubbled from userService.createUser
   */
  async signup(data: CreateUserInput): Promise<LoginServiceOutput> {
    // userService.createUser returns UserOutput (password already stripped)
    const user = await userService.createUser(data);
    const tokens = await generateTokens(user.id, user.role);
    return { user, tokens };
  },

  /**
   * Invalidates all active sessions for the user by deleting all refresh tokens from the DB.
   *
   * @param {string} userId - UUID of the user logging out
   * @returns {Promise<void>}
   */
  async logout(userId: string): Promise<void> {
    await refreshTokenRepository.deleteAllForUser(userId);
  },

  /**
   * Rotates a refresh token: verifies the JWT, validates the DB record, detects reuse,
   * deletes the old token, issues a new token pair with the same familyId, and returns
   * the updated user alongside the new tokens.
   *
   * @param {string} rawRefreshToken - The plaintext refresh token from the cookie
   * @returns {Promise<LoginServiceOutput>} Updated user DTO and new access + refresh tokens
   * @throws {NotAuthenticatedError} If the token is invalid, expired, reused, or the user no longer exists
   */
  async refresh(rawRefreshToken: string): Promise<LoginServiceOutput> {
    // Step 1 — verify JWT signature and expiry
    let payload: { id: string };
    try {
      payload = jwt.verify(
        rawRefreshToken,
        REFRESH_AUTH_CONFIG.REFRESH_TOKEN_SECRET,
      ) as { id: string };
    } catch {
      throw new NotAuthenticatedError("Invalid or expired refresh token");
    }

    // Step 2 — look up in DB (handles reuse detection)
    const record = await refreshTokenRepository.findByRawToken(rawRefreshToken);

    if (!record) {
      // Token passed JWT verification but is not in DB — already rotated.
      // This is a reuse attack — invalidate ALL sessions for this user.
      await refreshTokenRepository.deleteAllForUser(payload.id);
      throw new NotAuthenticatedError("Refresh token reuse detected — all sessions invalidated");
    }

    // Step 3 — belt-and-suspenders expiry check
    if (record.expiresAt < new Date()) {
      await refreshTokenRepository.deleteById(record.id);
      throw new NotAuthenticatedError("Refresh token expired");
    }

    // Step 4 — fetch current user
    const user = await userRepository.findById(record.userId);
    if (!user) {
      await refreshTokenRepository.deleteById(record.id);
      throw new NotAuthenticatedError("User not found");
    }

    // Step 5 — rotate: delete old row, issue new tokens preserving the familyId
    await refreshTokenRepository.deleteById(record.id);
    const newAccessToken = jwt.sign(
      { id: user.id, role: user.role },
      AUTH_CONFIG.JWT_SECRET,
      { expiresIn: AUTH_CONFIG.JWT_EXPIRES_IN as ms.StringValue },
    );
    const newRawRefreshToken = jwt.sign(
      { id: user.id },
      REFRESH_AUTH_CONFIG.REFRESH_TOKEN_SECRET,
      { expiresIn: REFRESH_AUTH_CONFIG.REFRESH_TOKEN_EXPIRES_IN as ms.StringValue },
    );
    const expiresAt = new Date(Date.now() + ms(REFRESH_AUTH_CONFIG.REFRESH_TOKEN_EXPIRES_IN as ms.StringValue));
    // Reuse the same familyId — this groups all rotated tokens from one login session.
    // On reuse detection, deleteAllForUser is used (not deleteByFamily) because the
    // DB record is absent and the family cannot be identified without it.
    await refreshTokenRepository.create(newRawRefreshToken, user.id, record.familyId, expiresAt);

    return {
      user: userOutputDTO(user),
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRawRefreshToken,
        refreshTokenExpiresAt: expiresAt,
      },
    };
  },
};
