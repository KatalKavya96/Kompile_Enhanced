import { describe, expect, it, vi } from "vitest";
import { rejectMongoOperators } from "../../src/middlewares/security.middleware.js";
import { requireRole } from "../../src/middlewares/role.middleware.js";

const run = (req) => {
  const next = vi.fn();
  rejectMongoOperators({ body: {}, query: {}, params: {}, ...req }, {}, next);
  return next.mock.calls[0][0];
};

describe("rejectMongoOperators", () => {
  it("lets normal input through", () => {
    expect(run({ body: { email: "a@b.c", tags: ["x"], nested: { ok: 1 } } })).toBeUndefined();
  });

  it.each([
    [{ body: { email: { $gt: "" } } }],
    [{ body: { list: [{ deep: { $where: "1" } }] } }],
    [{ body: { "profile.role": "admin" } }],
    [{ query: { start: { $gt: "1" } } }],
    [{ params: { id: { $ne: null } } }],
  ])("rejects %j", (req) => {
    expect(run(req)?.statusCode).toBe(400);
  });
});

describe("requireRole", () => {
  it("throws 401 without a user", () => {
    expect(() => requireRole("admin")({}, {}, vi.fn())).toThrow(/Unauthorized/);
  });

  it("throws 403 for a student", () => {
    expect(() => requireRole("admin")({ user: { role: "student" } }, {}, vi.fn())).toThrow(/permission/);
  });

  it("allows an admin", () => {
    const next = vi.fn();
    requireRole("admin")({ user: { role: "admin" } }, {}, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
