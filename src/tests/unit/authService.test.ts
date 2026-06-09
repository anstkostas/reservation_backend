/**
 * Unit tests for authService.
 * Type: unit (repositories and userService mocked).
 * Covers: login — happy path returns user and tokens with password excluded,
 *         unknown email throws ValidationError, wrong password throws same message
 *         (user enumeration prevention);
 *         signup — happy path returns user and tokens, error propagation from
 *         userService.createUser;
 *         logout — calls deleteAllForUser with the correct userId;
 *         refresh — invalid JWT string throws NotAuthenticatedError,
 *         expired JWT throws NotAuthenticatedError,
 *         token not in DB (reuse attack) calls deleteAllForUser and throws NotAuthenticatedError,
 *         DB record expired calls deleteById and throws NotAuthenticatedError,
 *         user not found calls deleteById and throws NotAuthenticatedError,
 *         happy path rotates tokens and returns user without password.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { authService } from "@/services/authService.js";
import { userRepository, refreshTokenRepository } from "@/repositories/index.js";
import { userService } from "@/services/userService.js";
import { ValidationError, NotAuthenticatedError } from "@/errors/index.js";
import { REFRESH_AUTH_CONFIG } from "@/config/env.js";
import { Role, type User, type RefreshToken } from "../../generated/prisma/index.js";
import type { UserOutput } from "@/dtos/index.js";

// vi.mock is hoisted by Vitest's transform to run before any module initialises,
// even though it appears here after the imports. authService will receive these
// mocked versions of userRepository and userService when it loads.
vi.mock("../../repositories/index.js", () => ({
  userRepository: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
  },
  refreshTokenRepository: {
    create: vi.fn(),
    findByRawToken: vi.fn(),
    deleteById: vi.fn(),
    deleteAllForUser: vi.fn(),
  },
}));

vi.mock("../../services/userService.js", () => ({
  userService: {
    createUser: vi.fn(),
  },
}));

// rounds=1 keeps bcrypt fast in tests (~1ms vs ~100ms at rounds=10)
const CORRECT_PASSWORD = "correctPassword123!";

const mockUser: User = {
  id: "user-uuid-1",
  email: "john@example.com",
  firstname: "John",
  lastname: "Doe",
  password: bcrypt.hashSync(CORRECT_PASSWORD, 1),
  role: Role.customer,
};

// UserOutput is what userService.createUser returns — password already stripped
const mockUserOutput: UserOutput = {
  id: mockUser.id,
  email: mockUser.email,
  firstname: mockUser.firstname,
  lastname: mockUser.lastname,
  role: mockUser.role,
};

const mockRefreshTokenRecord: RefreshToken = {
  id: "token-uuid-1",
  tokenHash: "hashed-token",
  userId: mockUser.id,
  familyId: "family-uuid-1",
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};

describe("authService", () => {
  beforeEach(() => {
    // Wipe call history between tests so counts stay accurate.
    // Does NOT reset mockResolvedValue — each test sets its own return value.
    vi.clearAllMocks();
  });

  describe("login", () => {
    it("returns a LoginOutput with user and token when credentials are correct", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);

      const result = await authService.login({
        email: mockUser.email,
        password: CORRECT_PASSWORD,
      });

      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.tokens.accessToken).toBeTruthy();
      // generateTokens signs both tokens — password must never appear in the output
      expect(result.user).not.toHaveProperty("password");
    });

    it("throws ValidationError for an unknown email", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

      const thrown = await authService
        .login({ email: "unknown@example.com", password: "any" })
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ValidationError);
      expect((thrown as ValidationError).message).toBe("Invalid email or password");
    });

    it("throws ValidationError for a wrong password — same message as unknown email", async () => {
      // Identical message is intentional: prevents user enumeration attacks.
      // An attacker must not be able to distinguish "email not found" from "wrong password".
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);

      const thrown = await authService
        .login({ email: mockUser.email, password: "wrongPassword!" })
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ValidationError);
      expect((thrown as ValidationError).message).toBe("Invalid email or password");
    });
  });

  describe("signup", () => {
    it("returns a LoginServiceOutput with user and tokens for valid input", async () => {
      vi.mocked(userService.createUser).mockResolvedValue(mockUserOutput);

      const result = await authService.signup({
        email: mockUser.email,
        password: "newPassword123!",
        firstname: mockUser.firstname,
        lastname: mockUser.lastname,
        role: "customer",
        restaurantId: null,
      });

      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.tokens.accessToken).toBeTruthy();
    });

    it("propagates errors thrown by userService.createUser", async () => {
      vi.mocked(userService.createUser).mockRejectedValue(
        new ValidationError("Email already taken", []),
      );

      const thrown = await authService
        .signup({
          email: mockUser.email,
          password: "newPassword123!",
          firstname: mockUser.firstname,
          lastname: mockUser.lastname,
          role: "customer",
          restaurantId: null,
        })
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ValidationError);
      expect((thrown as ValidationError).message).toBe("Email already taken");
    });
  });

  describe("logout", () => {
    it("calls deleteAllForUser with the correct userId", async () => {
      await authService.logout(mockUser.id);

      expect(refreshTokenRepository.deleteAllForUser).toHaveBeenCalledWith(mockUser.id);
      expect(refreshTokenRepository.deleteAllForUser).toHaveBeenCalledTimes(1);
    });
  });

  describe("refresh", () => {
    it("throws NotAuthenticatedError for an invalid JWT string", async () => {
      const thrown = await authService.refresh("invalid-token").catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(NotAuthenticatedError);
      expect((thrown as NotAuthenticatedError).message).toBe(
        "Invalid or expired refresh token",
      );
    });

    it("throws NotAuthenticatedError for an expired JWT", async () => {
      // Embed a past exp — same technique as makeExpiredJwt in testUtils.ts.
      const expiredToken = jwt.sign(
        { id: mockUser.id, exp: Math.floor(Date.now() / 1000) - 60 },
        REFRESH_AUTH_CONFIG.REFRESH_TOKEN_SECRET,
      );

      const thrown = await authService.refresh(expiredToken).catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(NotAuthenticatedError);
      expect((thrown as NotAuthenticatedError).message).toBe(
        "Invalid or expired refresh token",
      );
    });

    it("calls deleteAllForUser and throws when token is not in DB (reuse attack)", async () => {
      const validToken = jwt.sign(
        { id: mockUser.id },
        REFRESH_AUTH_CONFIG.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" },
      );
      vi.mocked(refreshTokenRepository.findByRawToken).mockResolvedValue(null);

      const thrown = await authService.refresh(validToken).catch((e: unknown) => e);

      expect(refreshTokenRepository.deleteAllForUser).toHaveBeenCalledWith(mockUser.id);
      expect(thrown).toBeInstanceOf(NotAuthenticatedError);
      expect((thrown as NotAuthenticatedError).message).toBe(
        "Refresh token reuse detected — all sessions invalidated",
      );
    });

    it("calls deleteById and throws when DB record is expired", async () => {
      const validToken = jwt.sign(
        { id: mockUser.id },
        REFRESH_AUTH_CONFIG.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" },
      );
      const expiredRecord: RefreshToken = {
        ...mockRefreshTokenRecord,
        expiresAt: new Date(Date.now() - 1000),
      };
      vi.mocked(refreshTokenRepository.findByRawToken).mockResolvedValue(expiredRecord);

      const thrown = await authService.refresh(validToken).catch((e: unknown) => e);

      expect(refreshTokenRepository.deleteById).toHaveBeenCalledWith(expiredRecord.id);
      expect(thrown).toBeInstanceOf(NotAuthenticatedError);
      expect((thrown as NotAuthenticatedError).message).toBe("Refresh token expired");
    });

    it("calls deleteById and throws when the user no longer exists", async () => {
      const validToken = jwt.sign(
        { id: mockUser.id },
        REFRESH_AUTH_CONFIG.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" },
      );
      vi.mocked(refreshTokenRepository.findByRawToken).mockResolvedValue(
        mockRefreshTokenRecord,
      );
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      const thrown = await authService.refresh(validToken).catch((e: unknown) => e);

      expect(refreshTokenRepository.deleteById).toHaveBeenCalledWith(
        mockRefreshTokenRecord.id,
      );
      expect(thrown).toBeInstanceOf(NotAuthenticatedError);
      expect((thrown as NotAuthenticatedError).message).toBe("User not found");
    });

    it("rotates tokens and returns the updated user on a valid token", async () => {
      const validToken = jwt.sign(
        { id: mockUser.id },
        REFRESH_AUTH_CONFIG.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" },
      );
      vi.mocked(refreshTokenRepository.findByRawToken).mockResolvedValue(
        mockRefreshTokenRecord,
      );
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);

      const result = await authService.refresh(validToken);

      expect(refreshTokenRepository.deleteById).toHaveBeenCalledWith(
        mockRefreshTokenRecord.id,
      );
      expect(result.user.id).toBe(mockUser.id);
      expect(result.tokens.accessToken).toBeTruthy();
      expect(result.tokens.refreshToken).toBeTruthy();
      // create called once confirms the old token was consumed and a new one persisted
      expect(refreshTokenRepository.create).toHaveBeenCalledTimes(1);
      // refresh preserves the userOutputDTO transform — password must never appear
      expect(result.user).not.toHaveProperty("password");
    });
  });
});
