/**
 * Unit tests for restaurantOutputDTO and restaurantPrivateOutputDTO — pure transforms, no mocks.
 * Type: unit.
 * Covers: restaurantOutputDTO exposes address + phone; restaurantPrivateOutputDTO EL translation
 * present, no translations, description shape is always an object.
 */
import { describe, it, expect } from "vitest";
import { restaurantOutputDTO, restaurantPrivateOutputDTO } from "@/dtos/index.js";
import type { Restaurant, RestaurantTranslation } from "../../generated/prisma/index.js";

const baseRestaurant: Restaurant = {
  id: "rest-uuid-1",
  name: "Test Bistro",
  description: "English description",
  address: "123 Main Street",
  phone: "555-1234",
  capacity: 10,
  logoUrl: "https://example.com/logo.png",
  coverImageUrl: "https://example.com/cover.png",
  ownerId: "owner-uuid-1",
};

const elTranslation: RestaurantTranslation = {
  id: "trans-uuid-1",
  restaurantId: "rest-uuid-1",
  locale: "el",
  description: "Ελληνική περιγραφή",
};

describe("restaurantOutputDTO", () => {
  it("includes address and phone in the public output", () => {
    const output = restaurantOutputDTO({ ...baseRestaurant });

    expect(output.address).toBe("123 Main Street");
    expect(output.phone).toBe("555-1234");
  });

  it("uses the translation description when a translations row is present", () => {
    const output = restaurantOutputDTO({
      ...baseRestaurant,
      translations: [elTranslation],
    });

    expect(output.description).toBe("Ελληνική περιγραφή");
  });

  it("falls back to the canonical description when no translations are provided", () => {
    const output = restaurantOutputDTO({ ...baseRestaurant });

    expect(output.description).toBe("English description");
  });
});

describe("restaurantPrivateOutputDTO", () => {
  it("maps description as { en, el } when an EL translation row exists", () => {
    const output = restaurantPrivateOutputDTO({
      ...baseRestaurant,
      translations: [elTranslation],
    });

    expect(output.description).toEqual({
      en: "English description",
      el: "Ελληνική περιγραφή",
    });
    expect(output.address).toBe("123 Main Street");
    expect(output.phone).toBe("555-1234");
  });

  it("sets description.el to null when no translation rows are present", () => {
    const output = restaurantPrivateOutputDTO({
      ...baseRestaurant,
      translations: [],
    });

    expect(output.description).toEqual({
      en: "English description",
      el: null,
    });
  });

  it("returns description as an object, never a flat string", () => {
    const output = restaurantPrivateOutputDTO({
      ...baseRestaurant,
      translations: [],
    });

    expect(typeof output.description).toBe("object");
    expect(output.description).not.toBeNull();
  });
});
