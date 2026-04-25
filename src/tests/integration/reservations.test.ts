import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "../../app.js";
import { testPrisma } from "../helpers/testPrismaClient.js";
import { testSeeds } from "../helpers/seeds.js";
import { COOKIE_CONFIG } from "../../config/env.js";
import { HTTP_STATUS } from "../../constants/index.js";
import { makeJwt } from "../helpers/testUtils.js";

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
