/**
 * Integration tests for reservation routes (POST /create, GET /my-reservations,
 * PUT /:id, DELETE /:id, POST /:id/resolve, GET /owner-reservations).
 * Type: integration (real I/O — supertest + test DB).
 * Covers: POST /create 201 happy path, POST /create 401 no auth, POST /create 403 wrong role,
 *   POST /create 404 restaurant not found, POST /create 400 within 4h of existing reservation,
 *   POST /create 400 restaurant at capacity, POST /create 400 less than 30 min from now,
 *   POST /create 400 more than 2 months in advance,
 *   GET /my-reservations 200 cross-customer isolation, GET /my-reservations 401 no auth,
 *   GET /my-reservations 403 owner role rejected,
 *   GET /owner-reservations 200 cross-restaurant isolation, GET /owner-reservations 401 no auth,
 *   GET /owner-reservations 403 customer role rejected,
 *   PUT /:id 200 happy path (update scheduledAt), PUT /:id 400 empty body (Zod refine),
 *   PUT /:id 400 non-active reservation, PUT /:id 403 cross-user update,
 *   PUT /:id 403 owner role rejected, PUT /:id 401 no auth, PUT /:id 404 not found,
 *   DELETE /:id 200 soft cancel (status = canceled), DELETE /:id 401 no auth,
 *   DELETE /:id 403 owner role rejected, DELETE /:id 403 cross-user cancel,
 *   DELETE /:id 400 cancel already-canceled, DELETE /:id 404 not found,
 *   POST /:id/resolve 200 mark completed, POST /:id/resolve 200 mark no-show,
 *   POST /:id/resolve 400 non-active reservation, POST /:id/resolve 401 no auth,
 *   POST /:id/resolve 403 customer role rejected,
 *   POST /:id/resolve 403 wrong restaurant owner, POST /:id/resolve 404 not found.
 * Not yet covered: POST /create 400 validation error (invalid restaurantId param format);
 *   PUT /:id booking-window constraint violations (30min/2month/4h/capacity — same rules as
 *   create, already tested on the create endpoint above);
 *   POST /:id/resolve 400 owner has no restaurant.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "@/app.js";
import { testPrisma } from "@/tests/helpers/testPrismaClient.js";
import { testSeeds } from "@/tests/helpers/seeds.js";
import { COOKIE_CONFIG } from "@/config/env.js";
import { HTTP_STATUS } from "@/constants/index.js";
import { makeJwt } from "@/tests/helpers/testUtils.js";

let customerId: string;
let customer2Id: string;
let ownerId: string;
let restaurantId: string;
let customerToken: string;
let ownerToken: string;

describe("Reservation integration tests", () => {
  // Users and restaurant are shared infrastructure — created once, not per-test.
  // Reservations (the subject under test) are cleared in afterEach.
  beforeAll(async () => {
    const customer = await testSeeds.createUser({
      email: "cust1@res-test.com",
      role: "customer",
    });
    customerId = customer.id;
    customerToken = makeJwt(customerId, "customer");

    const customer2 = await testSeeds.createUser({
      email: "cust2@res-test.com",
      role: "customer",
    });
    customer2Id = customer2.id;

    const owner = await testSeeds.createUser({
      email: "owner@res-test.com",
      role: "owner",
    });
    ownerId = owner.id;
    ownerToken = makeJwt(ownerId, "owner");

    const restaurant = await testSeeds.createRestaurant({ capacity: 2 });
    restaurantId = restaurant.id;
    // testSeeds.createRestaurant does not accept ownerId — connect after creation
    await testPrisma.restaurant.update({
      where: { id: restaurantId },
      data: { owner: { connect: { id: ownerId } } },
    });
  });

  afterAll(async () => {
    await testPrisma.reservation.deleteMany({ where: { restaurantId } });
    await testPrisma.restaurant.delete({ where: { id: restaurantId } });
    await testPrisma.user.deleteMany({
      where: { id: { in: [customerId, customer2Id, ownerId] } },
    });
  });

  afterEach(async () => {
    await testPrisma.reservation.deleteMany({ where: { restaurantId } });
  });

  it("rejects a reservation within 4 hours of an existing one for the same customer", async () => {
    // 5h from now — safely inside the 2-month booking window
    const base = new Date(Date.now() + 5 * 60 * 60 * 1000);
    await testSeeds.createReservation({ restaurantId, customerId, scheduledAt: base });

    // 2h after base — inside the 4-hour conflict window
    const conflict = new Date(base.getTime() + 2 * 60 * 60 * 1000);
    const res = await request(app)
      .post(`/api/reservations/restaurants/${restaurantId}`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${customerToken}`)
      .send({ scheduledAt: conflict.toISOString(), people: 2 });

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(res.body.message).toMatch(/4 hours/);
  });

  it("rejects a reservation when the restaurant is at capacity for that slot", async () => {
    // capacity = 2 — fill both slots, then attempt a third
    const slot = new Date(Date.now() + 25 * 60 * 60 * 1000);
    await testSeeds.createReservation({ restaurantId, customerId, scheduledAt: slot });
    await testSeeds.createReservation({
      restaurantId,
      customerId: customer2Id,
      scheduledAt: slot,
    });

    const customer3 = await testSeeds.createUser({
      email: "cust3@res-test.com",
      role: "customer",
    });
    const token3 = makeJwt(customer3.id, "customer");

    const res = await request(app)
      .post(`/api/reservations/restaurants/${restaurantId}`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token3}`)
      .send({ scheduledAt: slot.toISOString(), people: 1 });

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(res.body.message).toMatch(/fully booked/);

    // customer3 is not in the shared beforeAll users — clean up explicitly
    await testPrisma.user.delete({ where: { id: customer3.id } });
  });

  it("rejects a reservation scheduled less than 30 minutes from now", async () => {
    const tooSoon = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    const res = await request(app)
      .post(`/api/reservations/restaurants/${restaurantId}`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${customerToken}`)
      .send({ scheduledAt: tooSoon.toISOString(), people: 2 });

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(res.body.message).toMatch(/30 minutes/);
  });

  it("rejects a reservation more than 2 months in advance", async () => {
    const tooFar = new Date();
    tooFar.setMonth(tooFar.getMonth() + 3);

    const res = await request(app)
      .post(`/api/reservations/restaurants/${restaurantId}`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${customerToken}`)
      .send({ scheduledAt: tooFar.toISOString(), people: 2 });

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(res.body.message).toMatch(/2 months/);
  });

  it("sets status to canceled and does NOT delete the row", async () => {
    // Confirms soft-delete: history must be preserved, not hard-deleted
    const scheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const reservation = await testSeeds.createReservation({
      restaurantId,
      customerId,
      scheduledAt,
    });

    const res = await request(app)
      .delete(`/api/reservations/${reservation.id}`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${customerToken}`);

    expect(res.status).toBe(HTTP_STATUS.OK);

    const row = await testPrisma.reservation.findUnique({
      where: { id: reservation.id },
    });
    expect(row).not.toBeNull();
    expect(row?.status).toBe("canceled");
  });

  it("GET /my-reservations returns only the authenticated customer's reservations", async () => {
    // A customer must never see another customer's reservation data
    const ownReservation = await testSeeds.createReservation({ restaurantId, customerId });
    await testSeeds.createReservation({ restaurantId, customerId: customer2Id });

    const res = await request(app)
      .get("/api/reservations/my-reservations")
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${customerToken}`);

    expect(res.status).toBe(HTTP_STATUS.OK);
    const ids = res.body.data.map((r: { id: string }) => r.id);
    expect(ids).toContain(ownReservation.id);
    expect(ids.every((id: string) => id === ownReservation.id)).toBe(true);
  });

  it("GET /owner-reservations returns only the owner's restaurant reservations", async () => {
    // An owner must only see reservations for their own restaurant
    await testSeeds.createReservation({ restaurantId, customerId });
    await testSeeds.createReservation({ restaurantId, customerId: customer2Id });

    const res = await request(app)
      .get("/api/reservations/owner-reservations")
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${ownerToken}`);

    expect(res.status).toBe(HTTP_STATUS.OK);
    const reservations = res.body.data as Array<{ restaurantId: string }>;
    expect(reservations).toHaveLength(2);
    expect(reservations.every((r) => r.restaurantId === restaurantId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// POST /api/reservations/restaurants/:restaurantId — happy path and auth guards
// ---------------------------------------------------------------------------

describe("POST /api/reservations/restaurants/:restaurantId — happy path and auth guards", () => {
  let customer: { id: string };
  let owner: { id: string };
  let restaurantId: string;

  beforeAll(async () => {
    customer = await testSeeds.createUser({ email: "res-create-cust@test.com", role: "customer" });
    owner = await testSeeds.createUser({ email: "res-create-owner@test.com", role: "owner" });
    const restaurant = await testSeeds.createRestaurant({ capacity: 3 });
    restaurantId = restaurant.id;
    await testPrisma.restaurant.update({
      where: { id: restaurantId },
      data: { owner: { connect: { id: owner.id } } },
    });
  });

  afterAll(async () => {
    await testPrisma.reservation.deleteMany({ where: { restaurantId } });
    await testPrisma.restaurant.delete({ where: { id: restaurantId } });
    await testPrisma.user.deleteMany({ where: { id: { in: [customer.id, owner.id] } } });
  });

  afterEach(async () => {
    await testPrisma.reservation.deleteMany({ where: { restaurantId } });
  });

  it("responds 201 and returns the new reservation for an authenticated customer", async () => {
    const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h from now
    const token = makeJwt(customer.id, "customer");

    const res = await request(app)
      .post(`/api/reservations/restaurants/${restaurantId}`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`)
      .send({ scheduledAt: scheduledAt.toISOString(), people: 2 });

    expect(res.status).toBe(HTTP_STATUS.CREATED);
    expect(res.body.success).toBe(true);
    expect(res.body.data.restaurantId).toBe(restaurantId);
  });

  it("responds 401 when no cookie is sent", async () => {
    const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const res = await request(app)
      .post(`/api/reservations/restaurants/${restaurantId}`)
      .send({ scheduledAt: scheduledAt.toISOString(), people: 1 });

    expect(res.status).toBe(HTTP_STATUS.NOT_AUTHENTICATED);
  });

  it("responds 403 when an owner token is used on a customer-only route", async () => {
    const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const token = makeJwt(owner.id, "owner");

    const res = await request(app)
      .post(`/api/reservations/restaurants/${restaurantId}`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`)
      .send({ scheduledAt: scheduledAt.toISOString(), people: 1 });

    expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
  });

  it("responds 404 when the restaurant does not exist", async () => {
    const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const token = makeJwt(customer.id, "customer");

    const res = await request(app)
      .post("/api/reservations/restaurants/00000000-0000-0000-0000-000000000000")
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`)
      .send({ scheduledAt: scheduledAt.toISOString(), people: 1 });

    expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
  });
});

// ---------------------------------------------------------------------------
// Route auth guards — GET /my-reservations and GET /owner-reservations
// ---------------------------------------------------------------------------

describe("Route auth guards — GET /my-reservations and GET /owner-reservations", () => {
  let customer: { id: string };
  let owner: { id: string };

  beforeAll(async () => {
    customer = await testSeeds.createUser({ email: "res-guard-cust@test.com", role: "customer" });
    owner = await testSeeds.createUser({ email: "res-guard-owner@test.com", role: "owner" });
  });

  afterAll(async () => {
    await testPrisma.user.deleteMany({ where: { id: { in: [customer.id, owner.id] } } });
  });

  it("GET /my-reservations: responds 401 when no cookie is sent", async () => {
    const res = await request(app).get("/api/reservations/my-reservations");
    expect(res.status).toBe(HTTP_STATUS.NOT_AUTHENTICATED);
  });

  it("GET /my-reservations: responds 403 when an owner token is used", async () => {
    const token = makeJwt(owner.id, "owner");

    const res = await request(app)
      .get("/api/reservations/my-reservations")
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`);

    expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
  });

  it("GET /owner-reservations: responds 401 when no cookie is sent", async () => {
    const res = await request(app).get("/api/reservations/owner-reservations");
    expect(res.status).toBe(HTTP_STATUS.NOT_AUTHENTICATED);
  });

  it("GET /owner-reservations: responds 403 when a customer token is used", async () => {
    const token = makeJwt(customer.id, "customer");

    const res = await request(app)
      .get("/api/reservations/owner-reservations")
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`);

    expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/reservations/:id — update reservation
// ---------------------------------------------------------------------------

describe("PUT /api/reservations/:id — update reservation", () => {
  let customer: { id: string };
  let customer2: { id: string };
  let owner: { id: string };
  let restaurantId: string;

  beforeAll(async () => {
    customer = await testSeeds.createUser({ email: "res-put-cust@test.com", role: "customer" });
    customer2 = await testSeeds.createUser({ email: "res-put-cust2@test.com", role: "customer" });
    owner = await testSeeds.createUser({ email: "res-put-owner@test.com", role: "owner" });
    const restaurant = await testSeeds.createRestaurant({ capacity: 5 });
    restaurantId = restaurant.id;
    await testPrisma.restaurant.update({
      where: { id: restaurantId },
      data: { owner: { connect: { id: owner.id } } },
    });
  });

  afterAll(async () => {
    await testPrisma.reservation.deleteMany({ where: { restaurantId } });
    await testPrisma.restaurant.delete({ where: { id: restaurantId } });
    await testPrisma.user.deleteMany({ where: { id: { in: [customer.id, customer2.id, owner.id] } } });
  });

  afterEach(async () => {
    await testPrisma.reservation.deleteMany({ where: { restaurantId } });
  });

  it("responds 200 and updates scheduledAt for an active reservation", async () => {
    const reservation = await testSeeds.createReservation({ restaurantId, customerId: customer.id });
    const newTime = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6h from now
    const token = makeJwt(customer.id, "customer");

    const res = await request(app)
      .put(`/api/reservations/${reservation.id}`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`)
      .send({ scheduledAt: newTime.toISOString() });

    expect(res.status).toBe(HTTP_STATUS.OK);
    expect(res.body.success).toBe(true);
  });

  it("responds 400 when the request body is empty (Zod refine: at least one field required)", async () => {
    const reservation = await testSeeds.createReservation({ restaurantId, customerId: customer.id });
    const token = makeJwt(customer.id, "customer");

    const res = await request(app)
      .put(`/api/reservations/${reservation.id}`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`)
      .send({});

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });

  it("responds 400 when the reservation is not active (already canceled)", async () => {
    const reservation = await testSeeds.createReservation({
      restaurantId,
      customerId: customer.id,
      status: "canceled",
    });
    const newTime = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const token = makeJwt(customer.id, "customer");

    const res = await request(app)
      .put(`/api/reservations/${reservation.id}`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`)
      .send({ scheduledAt: newTime.toISOString() });

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });

  it("responds 403 when a customer tries to update another customer's reservation", async () => {
    const reservation = await testSeeds.createReservation({ restaurantId, customerId: customer.id });
    const token2 = makeJwt(customer2.id, "customer");
    const newTime = new Date(Date.now() + 6 * 60 * 60 * 1000);

    const res = await request(app)
      .put(`/api/reservations/${reservation.id}`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token2}`)
      .send({ scheduledAt: newTime.toISOString() });

    expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
  });

  it("responds 403 when an owner token is used on a customer-only route", async () => {
    const reservation = await testSeeds.createReservation({ restaurantId, customerId: customer.id });
    const ownerToken = makeJwt(owner.id, "owner");
    const newTime = new Date(Date.now() + 6 * 60 * 60 * 1000);

    const res = await request(app)
      .put(`/api/reservations/${reservation.id}`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${ownerToken}`)
      .send({ scheduledAt: newTime.toISOString() });

    expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
  });

  it("responds 401 when no cookie is sent", async () => {
    const reservation = await testSeeds.createReservation({ restaurantId, customerId: customer.id });
    const newTime = new Date(Date.now() + 6 * 60 * 60 * 1000);

    const res = await request(app)
      .put(`/api/reservations/${reservation.id}`)
      .send({ scheduledAt: newTime.toISOString() });

    expect(res.status).toBe(HTTP_STATUS.NOT_AUTHENTICATED);
  });

  it("responds 404 when the reservation does not exist", async () => {
    const token = makeJwt(customer.id, "customer");
    const newTime = new Date(Date.now() + 6 * 60 * 60 * 1000);

    const res = await request(app)
      .put("/api/reservations/00000000-0000-0000-0000-000000000000")
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`)
      .send({ scheduledAt: newTime.toISOString() });

    expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/reservations/:id — auth guards and cross-user protection
// ---------------------------------------------------------------------------

describe("DELETE /api/reservations/:id — auth guards and cross-user protection", () => {
  let customer: { id: string };
  let customer2: { id: string };
  let owner: { id: string };
  let restaurantId: string;

  beforeAll(async () => {
    customer = await testSeeds.createUser({ email: "res-del-cust@test.com", role: "customer" });
    customer2 = await testSeeds.createUser({ email: "res-del-cust2@test.com", role: "customer" });
    owner = await testSeeds.createUser({ email: "res-del-owner@test.com", role: "owner" });
    const restaurant = await testSeeds.createRestaurant({ capacity: 5 });
    restaurantId = restaurant.id;
    await testPrisma.restaurant.update({
      where: { id: restaurantId },
      data: { owner: { connect: { id: owner.id } } },
    });
  });

  afterAll(async () => {
    await testPrisma.reservation.deleteMany({ where: { restaurantId } });
    await testPrisma.restaurant.delete({ where: { id: restaurantId } });
    await testPrisma.user.deleteMany({ where: { id: { in: [customer.id, customer2.id, owner.id] } } });
  });

  afterEach(async () => {
    await testPrisma.reservation.deleteMany({ where: { restaurantId } });
  });

  it("responds 401 when no cookie is sent", async () => {
    const reservation = await testSeeds.createReservation({ restaurantId, customerId: customer.id });

    const res = await request(app).delete(`/api/reservations/${reservation.id}`);

    expect(res.status).toBe(HTTP_STATUS.NOT_AUTHENTICATED);
  });

  it("responds 403 when an owner token is used on a customer-only route", async () => {
    const reservation = await testSeeds.createReservation({ restaurantId, customerId: customer.id });
    const ownerToken = makeJwt(owner.id, "owner");

    const res = await request(app)
      .delete(`/api/reservations/${reservation.id}`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${ownerToken}`);

    expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
  });

  it("responds 403 when a customer tries to cancel another customer's reservation", async () => {
    const reservation = await testSeeds.createReservation({ restaurantId, customerId: customer.id });
    const token2 = makeJwt(customer2.id, "customer");

    const res = await request(app)
      .delete(`/api/reservations/${reservation.id}`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token2}`);

    expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
  });

  it("responds 400 when the reservation is already canceled", async () => {
    const reservation = await testSeeds.createReservation({
      restaurantId,
      customerId: customer.id,
      status: "canceled",
    });
    const token = makeJwt(customer.id, "customer");

    const res = await request(app)
      .delete(`/api/reservations/${reservation.id}`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`);

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });

  it("responds 404 when the reservation does not exist", async () => {
    const token = makeJwt(customer.id, "customer");

    const res = await request(app)
      .delete("/api/reservations/00000000-0000-0000-0000-000000000000")
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`);

    expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
  });
});

// ---------------------------------------------------------------------------
// POST /api/reservations/:id/resolve
// ---------------------------------------------------------------------------

describe("POST /api/reservations/:id/resolve", () => {
  let customer: { id: string };
  let owner1: { id: string };
  let owner2: { id: string };
  let restaurant1Id: string;
  let restaurant2Id: string;

  beforeAll(async () => {
    customer = await testSeeds.createUser({ email: "res-resolve-cust@test.com", role: "customer" });
    owner1 = await testSeeds.createUser({ email: "res-resolve-owner1@test.com", role: "owner" });
    owner2 = await testSeeds.createUser({ email: "res-resolve-owner2@test.com", role: "owner" });

    const restaurant1 = await testSeeds.createRestaurant({ capacity: 5 });
    restaurant1Id = restaurant1.id;
    await testPrisma.restaurant.update({
      where: { id: restaurant1Id },
      data: { owner: { connect: { id: owner1.id } } },
    });

    const restaurant2 = await testSeeds.createRestaurant({ capacity: 5 });
    restaurant2Id = restaurant2.id;
    await testPrisma.restaurant.update({
      where: { id: restaurant2Id },
      data: { owner: { connect: { id: owner2.id } } },
    });
  });

  afterAll(async () => {
    await testPrisma.reservation.deleteMany({
      where: { restaurantId: { in: [restaurant1Id, restaurant2Id] } },
    });
    await testPrisma.restaurant.deleteMany({ where: { id: { in: [restaurant1Id, restaurant2Id] } } });
    await testPrisma.user.deleteMany({ where: { id: { in: [customer.id, owner1.id, owner2.id] } } });
  });

  afterEach(async () => {
    await testPrisma.reservation.deleteMany({
      where: { restaurantId: { in: [restaurant1Id, restaurant2Id] } },
    });
  });

  it("responds 200 and marks the reservation as completed", async () => {
    const reservation = await testSeeds.createReservation({ restaurantId: restaurant1Id, customerId: customer.id });
    const token = makeJwt(owner1.id, "owner");

    const res = await request(app)
      .post(`/api/reservations/${reservation.id}/resolve`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`)
      .send({ status: "completed" });

    expect(res.status).toBe(HTTP_STATUS.OK);
    expect(res.body.data.status).toBe("completed");
  });

  it("responds 200 and marks the reservation as no-show", async () => {
    const reservation = await testSeeds.createReservation({ restaurantId: restaurant1Id, customerId: customer.id });
    const token = makeJwt(owner1.id, "owner");

    const res = await request(app)
      .post(`/api/reservations/${reservation.id}/resolve`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`)
      .send({ status: "no-show" });

    expect(res.status).toBe(HTTP_STATUS.OK);
    // reservationOutputDTO maps Prisma "no_show" → API "no-show" (brain gotcha)
    expect(res.body.data.status).toBe("no-show");
  });

  it("responds 400 when the reservation is not active (already canceled)", async () => {
    const reservation = await testSeeds.createReservation({
      restaurantId: restaurant1Id,
      customerId: customer.id,
      status: "canceled",
    });
    const token = makeJwt(owner1.id, "owner");

    const res = await request(app)
      .post(`/api/reservations/${reservation.id}/resolve`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`)
      .send({ status: "completed" });

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });

  it("responds 401 when no cookie is sent", async () => {
    const reservation = await testSeeds.createReservation({ restaurantId: restaurant1Id, customerId: customer.id });

    const res = await request(app)
      .post(`/api/reservations/${reservation.id}/resolve`)
      .send({ status: "completed" });

    expect(res.status).toBe(HTTP_STATUS.NOT_AUTHENTICATED);
  });

  it("responds 403 when a customer token is used on an owner-only route", async () => {
    const reservation = await testSeeds.createReservation({ restaurantId: restaurant1Id, customerId: customer.id });
    const token = makeJwt(customer.id, "customer");

    const res = await request(app)
      .post(`/api/reservations/${reservation.id}/resolve`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`)
      .send({ status: "completed" });

    expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
  });

  it("responds 403 when an owner tries to resolve a reservation at another owner's restaurant", async () => {
    // reservation at restaurant1 (owned by owner1) — owner2 must be rejected
    const reservation = await testSeeds.createReservation({ restaurantId: restaurant1Id, customerId: customer.id });
    const owner2Token = makeJwt(owner2.id, "owner");

    const res = await request(app)
      .post(`/api/reservations/${reservation.id}/resolve`)
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${owner2Token}`)
      .send({ status: "completed" });

    expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
  });

  it("responds 404 when the reservation does not exist", async () => {
    const token = makeJwt(owner1.id, "owner");

    const res = await request(app)
      .post("/api/reservations/00000000-0000-0000-0000-000000000000/resolve")
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`)
      .send({ status: "completed" });

    expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
  });
});
