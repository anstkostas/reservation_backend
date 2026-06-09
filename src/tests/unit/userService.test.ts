/**
 * Unit tests for userService.
 * Type: unit (deps mocked).
 * Covers: listUnownedRestaurants — returns empty array, maps RestaurantOutput correctly, omits
 *         address and phone, preserves order across multiple results, propagates repository errors;
 *         createUser — duplicate email ValidationError, customer happy path returns UserOutput
 *         without password, owner without restaurantId ValidationError, owner restaurant not found
 *         NotFoundError, owner restaurant already owned ValidationError, owner happy path calls
 *         assignOwner and returns UserOutput without password.
 * Possible expansions: listUnownedRestaurants — with translations joined (locale description
 *         fallback path in restaurantOutputDTO).
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { userService } from "@/services/userService.js";
import { userRepository, restaurantRepository } from "@/repositories/index.js";
import { ValidationError, NotFoundError } from "@/errors/index.js";
import { Role, type User, type Restaurant } from "../../generated/prisma/index.js";
import type { RestaurantOutput } from "@/dtos/index.js";
import { ERROR_CODES } from "@/constants/index.js";
import { prisma } from "@/config/prismaClient.js";

// Prisma $transaction has two overloads — cast to the interactive form so vi.mocked can
// bind a mockImplementation without a type error.
type InteractiveTxFn = (fn: (tx: typeof prisma) => Promise<unknown>) => Promise<unknown>;

// vi.mock uses RELATIVE paths — the @/ alias is not resolved by vitest's hoist transform
vi.mock("../../repositories/index.js", () => ({
  userRepository: {
    findByEmail: vi.fn(),
    create: vi.fn(),
  },
  restaurantRepository: {
    findUnowned: vi.fn(),
    findById: vi.fn(),
    assignOwner: vi.fn(),
  },
}));

// bcrypt.hash runs at SALT_ROUNDS=10 (~100ms) — mock it to keep unit tests fast
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
  },
}));

// prisma.$transaction is not exercised in the cases tested here (duplicate-email check fires
// before the transaction opens). Stubbed so the module can be imported without a real DB.
vi.mock("../../config/prismaClient.js", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

const mockUser: User = {
  id: "user-uuid-1",
  email: "jane@example.com",
  firstname: "Jane",
  lastname: "Doe",
  password: "hashed-password",
  role: Role.customer,
};

// Raw Restaurant row as Prisma returns it — includes fields the DTO intentionally strips
const mockRestaurant: Restaurant = {
  id: "restaurant-uuid-1",
  name: "The Test Kitchen",
  description: "A delightful test restaurant",
  address: "1 Test Lane",
  phone: "+30 210 0001111",
  capacity: 8,
  logoUrl: "https://cdn.example.com/logo.png",
  coverImageUrl: "https://cdn.example.com/cover.png",
  ownerId: null,
};

// restaurantOutputDTO strips address and phone — this is the expected shape
const expectedRestaurantOutput: RestaurantOutput = {
  id: mockRestaurant.id,
  name: mockRestaurant.name,
  description: mockRestaurant.description,
  capacity: mockRestaurant.capacity,
  logoUrl: mockRestaurant.logoUrl,
  coverImageUrl: mockRestaurant.coverImageUrl,
  ownerId: null,
};

describe("userService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: invoke the callback with the mocked prisma as the transaction client.
    // Repository mocks ignore the tx arg, so any test that reaches $transaction works.
    vi.mocked(prisma.$transaction as unknown as InteractiveTxFn).mockImplementation(
      async (fn) => fn(prisma)
    );
  });

  describe("listUnownedRestaurants", () => {
    it("returns an empty array when no unowned restaurants exist", async () => {
      vi.mocked(restaurantRepository.findUnowned).mockResolvedValue([]);

      const result = await userService.listUnownedRestaurants();

      expect(result).toEqual([]);
    });

    it("returns a mapped RestaurantOutput for a single unowned restaurant", async () => {
      vi.mocked(restaurantRepository.findUnowned).mockResolvedValue([mockRestaurant]);

      const result = await userService.listUnownedRestaurants();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedRestaurantOutput);
    });

    it("maps multiple restaurants, preserving order", async () => {
      const second: Restaurant = {
        ...mockRestaurant,
        id: "restaurant-uuid-2",
        name: "Second Kitchen",
      };
      vi.mocked(restaurantRepository.findUnowned).mockResolvedValue([mockRestaurant, second]);

      const result = await userService.listUnownedRestaurants();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(mockRestaurant.id);
      expect(result[1].id).toBe("restaurant-uuid-2");
      expect(result[1].name).toBe("Second Kitchen");
    });

    it("omits address and phone — fields the frontend does not consume", async () => {
      vi.mocked(restaurantRepository.findUnowned).mockResolvedValue([mockRestaurant]);

      const result = await userService.listUnownedRestaurants();

      expect(result[0]).not.toHaveProperty("address");
      expect(result[0]).not.toHaveProperty("phone");
    });

    it("propagates repository errors without swallowing them", async () => {
      vi.mocked(restaurantRepository.findUnowned).mockRejectedValue(new Error("DB failure"));

      const thrown = await userService.listUnownedRestaurants().catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(Error);
      expect((thrown as Error).message).toBe("DB failure");
    });
  });

  describe("createUser", () => {
    it("throws ValidationError with USER_EMAIL_EXISTS code when email is already taken", async () => {
      // This check fires before the transaction opens — no tx mock needed
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);

      const thrown = await userService
        .createUser({
          email: mockUser.email,
          password: "SomePass1!",
          firstname: "Jane",
          lastname: "Doe",
          role: "customer",
          restaurantId: null,
        })
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ValidationError);
      expect((thrown as ValidationError).message).toBe("Email already in use");
      expect((thrown as ValidationError).code).toBe(ERROR_CODES.USER_EMAIL_EXISTS);
    });

    it("returns UserOutput without password for a valid customer signup", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.create).mockResolvedValue(mockUser);

      const result = await userService.createUser({
        email: mockUser.email,
        password: "SomePass1!",
        firstname: mockUser.firstname,
        lastname: mockUser.lastname,
        role: "customer",
        restaurantId: null,
      });

      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result.role).toBe(Role.customer);
      // password must never appear in the service output
      expect(result).not.toHaveProperty("password");
    });

    it("throws ValidationError (USER_OWNER_RESTAURANT_REQUIRED) when owner provides no restaurantId", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.create).mockResolvedValue({ ...mockUser, role: Role.owner });

      const thrown = await userService
        .createUser({
          email: mockUser.email,
          password: "SomePass1!",
          firstname: mockUser.firstname,
          lastname: mockUser.lastname,
          role: "owner",
          restaurantId: null,
        })
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ValidationError);
      expect((thrown as ValidationError).code).toBe(ERROR_CODES.USER_OWNER_RESTAURANT_REQUIRED);
    });

    it("throws NotFoundError when the claimed restaurant does not exist", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.create).mockResolvedValue({ ...mockUser, role: Role.owner });
      vi.mocked(restaurantRepository.findById).mockResolvedValue(null);

      const thrown = await userService
        .createUser({
          email: mockUser.email,
          password: "SomePass1!",
          firstname: mockUser.firstname,
          lastname: mockUser.lastname,
          role: "owner",
          restaurantId: mockRestaurant.id,
        })
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(NotFoundError);
      expect((thrown as NotFoundError).code).toBe(ERROR_CODES.RESTAURANT_NOT_FOUND);
    });

    it("throws ValidationError (RESTAURANT_ALREADY_OWNED) when the claimed restaurant already has an owner", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.create).mockResolvedValue({ ...mockUser, role: Role.owner });
      vi.mocked(restaurantRepository.findById).mockResolvedValue({
        ...mockRestaurant,
        ownerId: "existing-owner-uuid",
      });

      const thrown = await userService
        .createUser({
          email: mockUser.email,
          password: "SomePass1!",
          firstname: mockUser.firstname,
          lastname: mockUser.lastname,
          role: "owner",
          restaurantId: mockRestaurant.id,
        })
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ValidationError);
      expect((thrown as ValidationError).code).toBe(ERROR_CODES.RESTAURANT_ALREADY_OWNED);
    });

    it("creates user and calls assignOwner for a valid owner signup", async () => {
      const ownerUser: User = { ...mockUser, role: Role.owner };
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.create).mockResolvedValue(ownerUser);
      vi.mocked(restaurantRepository.findById).mockResolvedValue(mockRestaurant);
      vi.mocked(restaurantRepository.assignOwner).mockResolvedValue(mockRestaurant);

      const result = await userService.createUser({
        email: ownerUser.email,
        password: "SomePass1!",
        firstname: ownerUser.firstname,
        lastname: ownerUser.lastname,
        role: "owner",
        restaurantId: mockRestaurant.id,
      });

      expect(result.id).toBe(ownerUser.id);
      expect(result.role).toBe(Role.owner);
      // password must never appear in the service output
      expect(result).not.toHaveProperty("password");
      expect(vi.mocked(restaurantRepository.assignOwner)).toHaveBeenCalledWith(
        mockRestaurant.id,
        ownerUser.id,
        prisma
      );
    });
  });
});
