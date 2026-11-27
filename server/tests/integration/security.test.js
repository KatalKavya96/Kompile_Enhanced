import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

vi.mock("../../src/utils/mail.js", async (orig) => ({
  ...(await orig()),
  sendEmail: vi.fn(async () => {}),
}));
vi.mock("../../src/services/contestEvent.service.js", () => ({
  fetchAndStoreContests: vi.fn(async () => 7),
}));
vi.mock("../../src/services/leetcode.service.js", () => ({
  fetchLeetcodeRawData: vi.fn(async () => {
    throw new Error("LeetCode must not be called in this test");
  }),
}));

const { default: app } = await import("../../src/app.js");
const { User, PlatformProfile } = await import("../../src/models/user.models.js");
const { fetchAndStoreContests } = await import("../../src/services/contestEvent.service.js");
const { fetchLeetcodeRawData } = await import("../../src/services/leetcode.service.js");
const { connectTestDb, resetDb, disconnectTestDb, createUser, loginAs } = await import(
  "../helpers.js"
);

beforeAll(() => connectTestDb("security"));
beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
});
afterAll(() => disconnectTestDb());

const registerBody = (email) => ({
  email,
  username: email.split("@")[0].replace(/[^a-z0-9]/gi, ""),
  password: "a-strong-password",
  confirmPassword: "a-strong-password",
});

describe("sign-up is limited to university emails", () => {
  it("rejects a personal email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send(registerBody("someone@gmail.com"));
    expect(res.status).toBe(403);
    expect(await User.countDocuments()).toBe(0);
  });

  it("rejects a look-alike domain", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send(registerBody("someone@nst.rishihood.edu.in.evil.com"));
    expect(res.status).toBe(403);
  });

  it("accepts a university email and makes a student", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send(registerBody("newstudent@nst.rishihood.edu.in"));
    expect(res.status).toBe(201);
    const user = await User.findOne({ email: "newstudent@nst.rishihood.edu.in" });
    expect(user.role).toBe("student");
  });

  it("rejects passwords shorter than 8 characters", async () => {
    const body = {
      ...registerBody("short@nst.rishihood.edu.in"),
      password: "abc",
      confirmPassword: "abc",
    };
    const res = await request(app).post("/api/v1/auth/register").send(body);
    expect(res.status).toBe(422);
  });

  it("ignores a role sent during registration", async () => {
    await request(app)
      .post("/api/v1/auth/register")
      .send({ ...registerBody("sneaky@nst.rishihood.edu.in"), role: "admin" });
    const user = await User.findOne({ email: "sneaky@nst.rishihood.edu.in" });
    expect(user?.role).toBe("student");
  });
});

describe("login", () => {
  it("gives the same answer for unknown email and wrong password", async () => {
    const user = await createUser();
    const unknown = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@nst.rishihood.edu.in", password: "x" });
    const wrong = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: "wrong-password" });
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  it("blocks NoSQL operator injection in the body", async () => {
    await createUser();
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: { $gt: "" }, password: { $gt: "" } });
    expect(res.status).toBe(400);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("blocks operator keys in query strings", async () => {
    const res = await request(app).get("/api/v1/events/contests?start[$gt]=1");
    expect(res.status).toBe(400);
  });
});

describe("roles", () => {
  it("a student cannot make themselves admin through the profile update", async () => {
    const user = await createUser();
    const agent = await loginAs(app, user);
    const res = await agent
      .put("/api/v1/users/update-basic-info")
      .send({ role: "admin", bio: "hi" });
    expect(res.status).toBe(200);
    const fresh = await User.findById(user._id);
    expect(fresh.role).toBe("student");
    expect(fresh.bio).toBe("hi");
  });

  it("contest sync: anonymous 401, student 403, admin 200", async () => {
    const student = await createUser();
    const admin = await createUser({ role: "admin" });

    expect((await request(app).post("/api/v1/events/contests/sync")).status).toBe(401);
    const asStudent = await loginAs(app, student);
    expect((await asStudent.post("/api/v1/events/contests/sync")).status).toBe(403);
    expect(fetchAndStoreContests).not.toHaveBeenCalled();

    const asAdmin = await loginAs(app, admin);
    const res = await asAdmin.post("/api/v1/events/contests/sync");
    expect(res.status).toBe(200);
    expect(res.body.data.upserted).toBe(7);
  });

  it("a role claim inside a token is ignored; the database role wins", async () => {
    const student = await createUser();
    const token = jwt.sign(
      { _id: student._id, role: "admin" },
      process.env.ACCESS_TOKEN_SECRET,
    );
    const res = await request(app)
      .post("/api/v1/events/contests/sync")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe("profile handles", () => {
  it("rejects non-string handles", async () => {
    const user = await createUser();
    const agent = await loginAs(app, user);
    const res = await agent
      .put("/api/v1/users/update-basic-info")
      .send({ leetcodeUsername: ["a", "b"] });
    expect(res.status).toBe(400);
  });

  it("no longer stores GitHub or GFG handles", async () => {
    const user = await createUser();
    const agent = await loginAs(app, user);
    await agent
      .put("/api/v1/users/update-basic-info")
      .send({ githubUsername: "gh", gfgUsername: "gfg", leetcodeUsername: "lc" });
    const fresh = await User.findById(user._id).lean();
    expect(fresh.connectedPlatforms.map((p) => p.platform)).toEqual(["leetcode"]);
  });
});

describe("public profile reads never trigger a live sync", () => {
  it("serves stored data to anonymous visitors without calling LeetCode", async () => {
    const user = await createUser({
      connectedPlatforms: [{ platform: "leetcode", username: "lc_handle" }],
    });
    await PlatformProfile.create({
      userId: user._id,
      platform: "leetcode",
      handle: "lc_handle",
      syncStatus: "success",
      stats: { totalQuestions: 10, activeDays: 0 },
    });
    const res = await request(app).get(`/api/v1/platforms/leetcode/${user.username}`);
    expect(res.status).toBe(200);
    expect(fetchLeetcodeRawData).not.toHaveBeenCalled();
    expect(res.headers["cache-control"]).toBe("public, max-age=60");
  });
});

describe("hardening", () => {
  it("sets security headers and hides the framework", async () => {
    const res = await request(app).get("/api/v1/healthcheck");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("does not leak internal error messages", async () => {
    const spy = vi
      .spyOn(User, "findOne")
      .mockRejectedValueOnce(new Error("secret internal detail"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "a@nst.rishihood.edu.in", password: "x" });
    spy.mockRestore();
    errSpy.mockRestore();
    expect(res.status).toBe(500);
    expect(res.text).not.toContain("secret internal detail");
  });

  it.each([
    ["post", "/api/v1/platforms/sync/github"],
    ["post", "/api/v1/platforms/sync/gfg"],
    ["get", "/api/v1/missions"],
    ["get", "/api/v1/auth/me/login-history"],
  ])("removed route %s %s is gone", async (method, path) => {
    const user = await createUser();
    const agent = await loginAs(app, user);
    const res = await agent[method](path);
    expect(res.status).toBe(404);
  });
});
