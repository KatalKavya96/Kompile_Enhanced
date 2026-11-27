// HTTP-level checks that need no database: they fail before any query runs.
import { describe, expect, it } from "vitest";
import request from "supertest";

const { default: app } = await import("../../src/app.js");

describe("app without a database", () => {
  it("sets security headers and hides the framework", async () => {
    const res = await request(app).get("/api/v1/healthcheck");
    expect(res.status).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("contest sync needs a login", async () => {
    const res = await request(app).post("/api/v1/events/contests/sync");
    expect(res.status).toBe(401);
  });

  it("rejects NoSQL operators before touching the database", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: { $ne: null }, password: "x" });
    expect(res.status).toBe(400);
  });

  it.each([
    ["post", "/api/v1/platforms/sync/github"],
    ["post", "/api/v1/platforms/sync/gfg"],
    ["get", "/api/v1/missions"],
    ["get", "/api/v1/auth/me/login-history"],
  ])("removed route %s %s answers 404 or 401, never 200", async (method, path) => {
    const res = await request(app)[method](path);
    expect([401, 404]).toContain(res.status);
  });
});
