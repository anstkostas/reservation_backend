/**
 * Unit tests for restaurantService — getOwnRestaurant + updateOwnRestaurant.
 * Type: unit (repositories and prisma.$transaction mocked).
 * Covers: getOwnRestaurant — non-owner ForbiddenError, owner-no-restaurant NotFoundError, happy path;
 *         updateOwnRestaurant — non-owner ForbiddenError, owner-no-restaurant NotFoundError,
 *           name-only payload calls update but NOT upsertTranslation,
 *           EL-only description calls upsertTranslation but NOT update,
 *           both en+el calls both update and upsertTranslation.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { restaurantService } from "@/services/restaurantService.js";
import { restaurantRepository } from "@/repositories/index.js";
import { prisma } from "@/config/prismaClient.js";
import { NotFoundError, ForbiddenError } from "@/errors/index.js";
import { Role, type Restaurant } from "../../generated/prisma/index.js";
import type { UserOutput } from "@/dtos/index.js";

// vi.mock uses RELATIVE paths (not the @/ alias) — vitest's hoisted mock cannot resolve the alias.
vi.mock("../../repositories/index.js", () => ({
  restaurantRepository: {
    findById: vi.fn(),
    findByOwnerId: vi.fn(),
    findByOwnerIdWithTranslations: vi.fn(),
    update: vi.fn(),
    upsertTranslation: vi.fn(),
    findAllLocalized: vi.fn(),
    findByIdLocalized: vi.fn(),
    findUnowned: vi.fn(),
  },
}));

vi.mock("../../config/prismaClient.js", () => ({
  prisma: { $transaction: vi.fn() },
}));

// $transaction is overloaded; vi.mocked() cannot resolve the interactive overload — narrow it first.
type InteractiveTxFn = (fn: (tx: typeof prisma) => Promise<unknown>) => Promise<unknown>;

const ownerId = "owner-uuid-1";
const restaurantId = "restaurant-uuid-1";

const mockOwner: UserOutput = {
  id: ownerId,
  email: "owner@example.com",
  firstname: "Ow",
  lastname: "Ner",
  role: Role.owner,
};

const mockCustomer: UserOutput = {
  id: "customer-uuid-1",
  email: "customer@example.com",
  firstname: "Cu",
  lastname: "St",
  role: Role.customer,
};

const mockRestaurant: Restaurant = {
  id: restaurantId,
  name: "Test Bistro",
  description: "English description",
  address: "123 Main Street",
  phone: "555-1234",
  capacity: 10,
  logoUrl: "https://example.com/logo.png",
  coverImageUrl: "https://example.com/cover.png",
  ownerId,
};

const mockRestaurantWithTranslations = {
  ...mockRestaurant,
  translations: [],
};

describe("restaurantService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction as unknown as InteractiveTxFn).mockImplementation(
      async (fn) => fn(prisma),
    );
  });

  describe("getOwnRestaurant", () => {
    it("throws ForbiddenError when user is not an owner", async () => {
      const thrown = await restaurantService
        .getOwnRestaurant(mockCustomer)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ForbiddenError);
      expect(restaurantRepository.findByOwnerIdWithTranslations).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the owner has no restaurant", async () => {
      vi.mocked(restaurantRepository.findByOwnerIdWithTranslations).mockResolvedValue(null);

      const thrown = await restaurantService
        .getOwnRestaurant(mockOwner)
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(NotFoundError);
    });

    it("returns the private DTO when owner has a restaurant", async () => {
      vi.mocked(restaurantRepository.findByOwnerIdWithTranslations).mockResolvedValue(
        mockRestaurantWithTranslations,
      );

      const result = await restaurantService.getOwnRestaurant(mockOwner);

      expect(restaurantRepository.findByOwnerIdWithTranslations).toHaveBeenCalledWith(ownerId);
      expect(result.id).toBe(restaurantId);
      expect(result.description).toEqual({ en: "English description", el: null });
      expect(result.address).toBe("123 Main Street");
    });
  });

  describe("updateOwnRestaurant", () => {
    it("throws ForbiddenError when user is not an owner", async () => {
      const thrown = await restaurantService
        .updateOwnRestaurant(mockCustomer, { name: "New Name" })
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(ForbiddenError);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the owner has no restaurant", async () => {
      vi.mocked(restaurantRepository.findByOwnerId).mockResolvedValue(null);

      const thrown = await restaurantService
        .updateOwnRestaurant(mockOwner, { name: "New Name" })
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(NotFoundError);
    });

    it("calls repository.update with scalar data for a name-only payload", async () => {
      vi.mocked(restaurantRepository.findByOwnerId).mockResolvedValue(mockRestaurant);
      vi.mocked(restaurantRepository.findByOwnerIdWithTranslations).mockResolvedValue(
        mockRestaurantWithTranslations,
      );

      await restaurantService.updateOwnRestaurant(mockOwner, { name: "Renamed Bistro" });

      expect(restaurantRepository.update).toHaveBeenCalledWith(
        restaurantId,
        { name: "Renamed Bistro" },
        expect.anything(),
      );
      expect(restaurantRepository.upsertTranslation).not.toHaveBeenCalled();
    });

    it("calls upsertTranslation but NOT update for an EL-only description payload", async () => {
      vi.mocked(restaurantRepository.findByOwnerId).mockResolvedValue(mockRestaurant);
      vi.mocked(restaurantRepository.findByOwnerIdWithTranslations).mockResolvedValue(
        mockRestaurantWithTranslations,
      );

      await restaurantService.updateOwnRestaurant(mockOwner, {
        description: { el: "Γεια" },
      });

      expect(restaurantRepository.upsertTranslation).toHaveBeenCalledWith(
        restaurantId,
        "el",
        "Γεια",
        expect.anything(),
      );
      expect(restaurantRepository.update).not.toHaveBeenCalled();
    });

    it("calls both update and upsertTranslation when description has both en and el", async () => {
      vi.mocked(restaurantRepository.findByOwnerId).mockResolvedValue(mockRestaurant);
      vi.mocked(restaurantRepository.findByOwnerIdWithTranslations).mockResolvedValue(
        mockRestaurantWithTranslations,
      );

      await restaurantService.updateOwnRestaurant(mockOwner, {
        description: { en: "New EN", el: "Νέο EL" },
      });

      expect(restaurantRepository.update).toHaveBeenCalledWith(
        restaurantId,
        { description: "New EN" },
        expect.anything(),
      );
      expect(restaurantRepository.upsertTranslation).toHaveBeenCalledWith(
        restaurantId,
        "el",
        "Νέο EL",
        expect.anything(),
      );
    });
  });
});
