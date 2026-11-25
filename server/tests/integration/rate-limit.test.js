import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Use a small limit so the test is fast; production default is 20 per 15 minutes.
process.env.AUTH_RATE_LIMIT = "3";
const { default: app } = await import("../../src/app.js");
const { connectTestDb, disconnectTestDb } = await import("../helpers.js");

beforeAll(() => connectTestDb("ratelimit"));
afterAll(() => disconnectTestDb());

describe("login rate limit", () => {
  it("returns 429 after too many attempts from one IP", async () => {
    const attempt = () =>
      request(app)
        .post("/api/v1/auth/login")
        .send({ email: "x@nst.rishihood.edu.in", password: "nope" });
    for (let i = 0; i < 3; i += 1) expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(429);
  });
});
