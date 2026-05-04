import { vi, describe, it, expect, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { authService } from "../../services/authService.js";
import { userRepository } from "../../repositories/index.js";
import { userService } from "../../services/userService.js";
import { ValidationError } from "../../errors/index.js";
import { Role, type User } from "../../generated/prisma/index.js";
import type { UserOutput } from "../../dtos/index.js";

// vi.mock is hoisted by Vitest's transform to run before any module initialises,
// even though it appears here after the imports. authService will receive these
// mocked versions of userRepository and userService when it loads.
vi.mock("../../repositories/index.js", () => ({
  userRepository: {
    findByEmail: vi.fn(),
  },
  refreshTokenRepository: {
    create: vi.fn(),
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
  });
});
