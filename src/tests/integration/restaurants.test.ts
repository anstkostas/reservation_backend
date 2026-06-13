/**
 * Integration tests for owner-facing restaurant routes.
 * GET /api/restaurants/me  — load owner's own restaurant (private shape)
 * PUT /api/restaurants/me  — partial update of the 5 editable fields
 * Type: integration (supertest + real test DB).
 * Covers: GET 200 private shape, GET 401/403/404;
 *   PUT 200 name-only, PUT 200 both description locales, PUT 200 EL-only,
 *   PUT 400 empty body / invalid capacity / short name, PUT 401/403/404.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "@/app.js";
import { testPrisma } from "@/tests/helpers/testPrismaClient.js";
import { testSeeds } from "@/tests/helpers/seeds.js";
import { COOKIE_CONFIG } from "@/config/env.js";
import { HTTP_STATUS } from "@/constants/index.js";
import { makeJwt } from "@/tests/helpers/testUtils.js";

let ownerId: string;
let customerId: string;
let ownerNoRestaurantId: string;
let ownerToken: string;
let customerToken: string;
let ownerNoRestaurantToken: string;
let restaurantId: string;

describe("Restaurant /me integration tests", () => {
  // Users are shared infrastructure — created once, not per-test.
  // The restaurant is the subject under test — recreated fresh each test via beforeEach.
  beforeAll(async () => {
    const owner = await testSeeds.createUser({ email: "owner@me-test.com", role: "owner" });
    ownerId = owner.id;
    ownerToken = makeJwt(ownerId, "owner");

    const customer = await testSeeds.createUser({
      email: "customer@me-test.com",
      role: "customer",
    });
    customerId = customer.id;
    customerToken = makeJwt(customerId, "customer");

    const ownerNoRestaurant = await testSeeds.createUser({
      email: "ownernorest@me-test.com",
      role: "owner",
    });
    ownerNoRestaurantId = ownerNoRestaurant.id;
    ownerNoRestaurantToken = makeJwt(ownerNoRestaurantId, "owner");
  });

  beforeEach(async () => {
    // testSeeds.createRestaurant does not accept ownerId — connect after creation
    const restaurant = await testSeeds.createRestaurant();
    restaurantId = restaurant.id;
    await testPrisma.restaurant.update({
      where: { id: restaurantId },
      data: { owner: { connect: { id: ownerId } } },
    });
  });

  afterEach(async () => {
    // restaurant_translations cascade-delete via schema onDelete: Cascade
    await testPrisma.restaurant.delete({ where: { id: restaurantId } });
  });

  afterAll(async () => {
    await testPrisma.user.deleteMany({
      where: { id: { in: [ownerId, customerId, ownerNoRestaurantId] } },
    });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  describe("GET /api/restaurants/me", () => {
    it("returns 200 with private shape for the owner (address, phone, description {en,el})", async () => {
      const res = await request(app)
        .get("/api/restaurants/me")
        .set("Cookie", `${COOKIE_CONFIG.NAME}=${ownerToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      // Oracle: spec §2.4 — private DTO exposes address + phone
      expect(res.body.data).toHaveProperty("address");
      expect(res.body.data).toHaveProperty("phone");
      // Oracle: description is always an object { en, el }; el null when no EL row seeded
      expect(res.body.data.description).toEqual({ en: "A test restaurant", el: null });
      // No password leak anywhere in the response
      expect(JSON.stringify(res.body)).not.toContain("password");
    });

    it("returns 401 when no cookie is sent", async () => {
      const res = await request(app).get("/api/restaurants/me");
      expect(res.status).toBe(HTTP_STATUS.NOT_AUTHENTICATED);
    });

    it("returns 403 for customer token (requireRole rejects)", async () => {
      const res = await request(app)
        .get("/api/restaurants/me")
        .set("Cookie", `${COOKIE_CONFIG.NAME}=${customerToken}`);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
    });

    it("returns 404 for an owner who has no restaurant", async () => {
      const res = await request(app)
        .get("/api/restaurants/me")
        .set("Cookie", `${COOKIE_CONFIG.NAME}=${ownerNoRestaurantToken}`);

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  describe("PUT /api/restaurants/me", () => {
    it("returns 200 and updates only the name — other fields unchanged", async () => {
      const res = await request(app)
        .put("/api/restaurants/me")
        .set("Cookie", `${COOKIE_CONFIG.NAME}=${ownerToken}`)
        .send({ name: "Renamed Bistro" });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.name).toBe("Renamed Bistro");

      // Verify via DB that other fields are untouched
      const db = await testPrisma.restaurant.findUnique({ where: { id: restaurantId } });
      expect(db?.name).toBe("Renamed Bistro");
      expect(db?.capacity).toBe(5); // seed default unchanged
    });

    it("returns 200 and writes both description locales atomically", async () => {
      const res = await request(app)
        .put("/api/restaurants/me")
        .set("Cookie", `${COOKIE_CONFIG.NAME}=${ownerToken}`)
        .send({ description: { en: "New EN", el: "Νέο EL" } });

      expect(res.status).toBe(HTTP_STATUS.OK);

      // Oracle: EN goes to Restaurant.description; EL goes to restaurant_translations row
      const db = await testPrisma.restaurant.findUnique({ where: { id: restaurantId } });
      expect(db?.description).toBe("New EN");

      const elRow = await testPrisma.restaurantTranslation.findUnique({
        where: { restaurantId_locale: { restaurantId, locale: "el" } },
      });
      expect(elRow?.description).toBe("Νέο EL");
    });

    it("returns 200 and upserts EL translation only — canonical description unchanged", async () => {
      const res = await request(app)
        .put("/api/restaurants/me")
        .set("Cookie", `${COOKIE_CONFIG.NAME}=${ownerToken}`)
        .send({ description: { el: "Μόνο EL" } });

      expect(res.status).toBe(HTTP_STATUS.OK);

      const db = await testPrisma.restaurant.findUnique({ where: { id: restaurantId } });
      expect(db?.description).toBe("A test restaurant"); // seed value, unchanged

      const elRow = await testPrisma.restaurantTranslation.findUnique({
        where: { restaurantId_locale: { restaurantId, locale: "el" } },
      });
      expect(elRow?.description).toBe("Μόνο EL");
    });

    it("returns 400 for an empty body {} (refine: at least one field required)", async () => {
      const res = await request(app)
        .put("/api/restaurants/me")
        .set("Cookie", `${COOKIE_CONFIG.NAME}=${ownerToken}`)
        .send({});

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    it("returns 400 for capacity: 0", async () => {
      const res = await request(app)
        .put("/api/restaurants/me")
        .set("Cookie", `${COOKIE_CONFIG.NAME}=${ownerToken}`)
        .send({ capacity: 0 });

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    it("returns 400 for a name shorter than 4 chars", async () => {
      const res = await request(app)
        .put("/api/restaurants/me")
        .set("Cookie", `${COOKIE_CONFIG.NAME}=${ownerToken}`)
        .send({ name: "ab" });

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    it("returns 401 when no cookie is sent", async () => {
      const res = await request(app)
        .put("/api/restaurants/me")
        .send({ name: "Valid Name" });

      expect(res.status).toBe(HTTP_STATUS.NOT_AUTHENTICATED);
    });

    it("returns 403 for customer token", async () => {
      const res = await request(app)
        .put("/api/restaurants/me")
        .set("Cookie", `${COOKIE_CONFIG.NAME}=${customerToken}`)
        .send({ name: "Valid Name" });

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
    });

    it("returns 404 for an owner who has no restaurant", async () => {
      const res = await request(app)
        .put("/api/restaurants/me")
        .set("Cookie", `${COOKIE_CONFIG.NAME}=${ownerNoRestaurantToken}`)
        .send({ name: "Valid Name" });

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });
});
