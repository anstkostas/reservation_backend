import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import request from "supertest";
import type { User } from "../../generated/prisma/index.js";
import app from "../../app.js";
import { testPrisma } from "../helpers/testPrismaClient.js";
import { testSeeds } from "../helpers/seeds.js";
import { COOKIE_CONFIG } from "../../config/env.js";
import { HTTP_STATUS } from "../../constants/index.js";
import { makeJwt, makeExpiredJwt } from "../helpers/testUtils.js";

// Matches testSeeds.createUser default — used in login test request bodies
const TEST_PASSWORD = "Test@1234";

// Fixed email for signup tests — afterEach cleans up by this email
const SIGNUP_EMAIL = "auth-integration-signup@example.com";

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

describe("POST /api/auth/login", () => {
  let user: User;

  beforeEach(async () => {
    user = await testSeeds.createUser();
  });

  afterEach(async () => {
    await testPrisma.user.delete({ where: { id: user.id } });
  });

  it("responds 200 and sets the auth cookie on valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: TEST_PASSWORD });

    expect(res.status).toBe(HTTP_STATUS.OK);
    expect(res.body.success).toBe(true);
    const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
    expect(cookies?.some((c) => c.startsWith(`${COOKIE_CONFIG.NAME}=`))).toBe(true);
  });

  it("responds 400 for a wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "WrongPass123!" });

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("responds 400 for an unknown email — same message as wrong password", async () => {
    // Identical message prevents user enumeration: the caller cannot tell whether
    // the email exists or the password is wrong.
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: TEST_PASSWORD });

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(res.body.message).toBe("Invalid email or password");
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/signup
// ---------------------------------------------------------------------------

describe("POST /api/auth/signup", () => {
  afterEach(async () => {
    // Covers both test cases: the success case (user created via HTTP) and the
    // duplicate-email case (user created by testSeeds before the request).
    await testPrisma.user.deleteMany({ where: { email: SIGNUP_EMAIL } });
  });

  it("responds 201 and sets the auth cookie for a new user", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({
        email: SIGNUP_EMAIL,
        password: "Signup123!A",
        firstname: "Auth",
        lastname: "Test",
        role: "customer",
      });

    expect(res.status).toBe(HTTP_STATUS.CREATED);
    const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
    expect(cookies?.some((c) => c.startsWith(`${COOKIE_CONFIG.NAME}=`))).toBe(true);
  });

  it("responds 400 for a duplicate email", async () => {
    // Seed the conflicting user directly — bypasses signup validation intentionally
    await testSeeds.createUser({ email: SIGNUP_EMAIL });

    const res = await request(app)
      .post("/api/auth/signup")
      .send({
        email: SIGNUP_EMAIL,
        password: "Signup123!A",
        firstname: "Auth",
        lastname: "Test",
        role: "customer",
      });

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------

describe("POST /api/auth/logout", () => {
  let user: User;

  beforeEach(async () => {
    user = await testSeeds.createUser();
  });

  afterEach(async () => {
    await testPrisma.user.delete({ where: { id: user.id } });
  });

  it("responds 200 and clears the auth cookie when authenticated", async () => {
    const token = makeJwt(user.id, "customer");

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`);

    expect(res.status).toBe(HTTP_STATUS.OK);
    // res.clearCookie sets the cookie to an empty value with a past expiry
    const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
    expect(cookies?.some((c) => c.startsWith(`${COOKIE_CONFIG.NAME}=;`))).toBe(true);
  });

  it("responds 401 when called without a cookie", async () => {
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(HTTP_STATUS.NOT_AUTHENTICATED);
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------

describe("GET /api/auth/me", () => {
  it("responds 401 when no cookie is present", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(HTTP_STATUS.NOT_AUTHENTICATED);
  });
});

// ---------------------------------------------------------------------------
// Role enforcement
// ---------------------------------------------------------------------------

describe("role enforcement", () => {
  let customer: User;
  let owner: User;

  beforeEach(async () => {
    // Sequential creates — Date.now() differs between them due to bcrypt hashing,
    // so testSeeds generates unique emails for both.
    customer = await testSeeds.createUser();
    owner = await testSeeds.createUser({ role: "owner" });
  });

  afterEach(async () => {
    await testPrisma.user.delete({ where: { id: customer.id } });
    await testPrisma.user.delete({ where: { id: owner.id } });
  });

  it("responds 403 when a customer JWT is sent to an owner-only route", async () => {
    const token = makeJwt(customer.id, "customer");

    const res = await request(app)
      .get("/api/reservations/owner-reservations")
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`);

    expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
  });

  it("responds 403 when an owner JWT is sent to a customer-only route", async () => {
    const token = makeJwt(owner.id, "owner");

    const res = await request(app)
      .get("/api/reservations/my-reservations")
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`);

    expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
  });
});

// ---------------------------------------------------------------------------
// requireAuth middleware edge cases
// ---------------------------------------------------------------------------

describe("requireAuth middleware edge cases", () => {
  it("responds 401 for an expired token", async () => {
    // exp set 10s in the past — token is already expired at verify time,
    // no flaky timing dependency on expiresIn
    const expiredToken = makeExpiredJwt("any-id", "customer");

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${expiredToken}`);

    expect(res.status).toBe(HTTP_STATUS.NOT_AUTHENTICATED);
    expect(res.body.message).toBe("Token expired");
  });

  it("responds 401 for a tampered (invalid) token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `${COOKIE_CONFIG.NAME}=this.is.not.a.valid.jwt`);

    expect(res.status).toBe(HTTP_STATUS.NOT_AUTHENTICATED);
    expect(res.body.message).toBe("Invalid token");
  });

  it("responds 401 when the token is valid but the user has been deleted", async () => {
    // Simulates a token that was valid at issue time but the account no longer
    // exists — only reachable by deleting the user directly, bypassing the service
    const user = await testSeeds.createUser();
    const token = makeJwt(user.id, "customer");
    await testPrisma.user.delete({ where: { id: user.id } });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `${COOKIE_CONFIG.NAME}=${token}`);

    expect(res.status).toBe(HTTP_STATUS.NOT_AUTHENTICATED);
    expect(res.body.message).toBe("User not found");
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/signup — owner validation
// ---------------------------------------------------------------------------

describe("POST /api/auth/signup — owner validation", () => {
  let ownedRestaurantId: string;
  const OWNER_SIGNUP_EMAIL = "owner-test@signup-test.com";

  beforeAll(async () => {
    const restaurant = await testSeeds.createRestaurant();
    const existingOwner = await testSeeds.createUser({
      email: "existing-owner@signup-test.com",
      role: "owner",
    });
    await testPrisma.restaurant.update({
      where: { id: restaurant.id },
      data: { owner: { connect: { id: existingOwner.id } } },
    });
    ownedRestaurantId = restaurant.id;
  });

  afterAll(async () => {
    // Delete restaurant before owner — FK is on Restaurant.ownerId → User.id,
    // so the restaurant must be removed first to avoid a constraint violation
    await testPrisma.restaurant.delete({ where: { id: ownedRestaurantId } });
    await testPrisma.user.deleteMany({
      where: {
        email: { in: ["existing-owner@signup-test.com", OWNER_SIGNUP_EMAIL] },
      },
    });
  });

  afterEach(async () => {
    await testPrisma.user.deleteMany({ where: { email: OWNER_SIGNUP_EMAIL } });
  });

  it("responds 404 when signing up as owner with a non-existent restaurantId", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({
        email: OWNER_SIGNUP_EMAIL,
        password: "Signup123!A",
        firstname: "Owner",
        lastname: "Test",
        role: "owner",
        restaurantId: "00000000-0000-0000-0000-000000000000",
      });

    expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
  });

  it("responds 400 when signing up as owner claiming an already-owned restaurant", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({
        email: OWNER_SIGNUP_EMAIL,
        password: "Signup123!A",
        firstname: "Owner",
        lastname: "Test",
        role: "owner",
        restaurantId: ownedRestaurantId,
      });

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(res.body.message).toBe("Restaurant already has an owner");
  });
});
