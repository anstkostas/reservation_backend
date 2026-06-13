/**
 * Unit tests for restaurantValidation — updateRestaurantSchema.
 * Type: unit (pure Zod schema, no mocks needed).
 * Covers: all valid partial payloads, empty-body refine, field-level rejections.
 */
import { describe, it, expect } from "vitest";
import { updateRestaurantSchema } from "@/validation/index.js";

describe("updateRestaurantSchema", () => {
  it("accepts a name-only partial payload", () => {
    const result = updateRestaurantSchema.safeParse({ name: "Valid Name" });
    expect(result.success).toBe(true);
  });

  it("accepts { description: { en: 'Hi' } }", () => {
    const result = updateRestaurantSchema.safeParse({ description: { en: "Hi" } });
    expect(result.success).toBe(true);
  });

  it("accepts { description: { el: '' } } — empty EL string is allowed", () => {
    const result = updateRestaurantSchema.safeParse({ description: { el: "" } });
    expect(result.success).toBe(true);
  });

  it("accepts { description: { en: 'Hi', el: 'Γεια' } }", () => {
    const result = updateRestaurantSchema.safeParse({ description: { en: "Hi", el: "Γεια" } });
    expect(result.success).toBe(true);
  });

  it("accepts a full payload with all 5 editable fields", () => {
    const result = updateRestaurantSchema.safeParse({
      name: "My Restaurant",
      description: { en: "English description", el: "Ελληνική περιγραφή" },
      address: "123 Main Street",
      phone: "555-1234",
      capacity: 10,
    });
    expect(result.success).toBe(true);
  });

  it("rejects {} — refine: at least one field must be provided", () => {
    const result = updateRestaurantSchema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("At least one field must be provided");
  });

  it("rejects { name: 'abc' } — name min is 4 chars", () => {
    const result = updateRestaurantSchema.safeParse({ name: "abc" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("name");
  });

  it("rejects { capacity: 0 } — capacity min is 1", () => {
    const result = updateRestaurantSchema.safeParse({ capacity: 0 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("capacity");
  });

  it("rejects { capacity: -1 } — capacity min is 1", () => {
    const result = updateRestaurantSchema.safeParse({ capacity: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects { capacity: 2.5 } — capacity must be an integer", () => {
    const result = updateRestaurantSchema.safeParse({ capacity: 2.5 });
    expect(result.success).toBe(false);
  });

  it("rejects { description: { en: '' } } — EN cannot be blank", () => {
    const result = updateRestaurantSchema.safeParse({ description: { en: "" } });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("en");
  });
});
