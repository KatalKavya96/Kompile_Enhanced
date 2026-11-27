import { describe, expect, it } from "vitest";
import { isAllowedEmail } from "../../src/utils/email-domain.js";

describe("isAllowedEmail", () => {
  it.each([
    ["kavya@nst.rishihood.edu.in", true],
    ["KAVYA@NST.RISHIHOOD.EDU.IN", true],
    ["kavya@gmail.com", false],
    ["kavya@nst.rishihood.edu.in.attacker.com", false],
    ["kavya@sub.nst.rishihood.edu.in", false],
    ["nst.rishihood.edu.in", false],
    ["@nst.rishihood.edu.in", false],
    [null, false],
    [{ $gt: "" }, false],
  ])("%s -> %s", (email, ok) => {
    expect(isAllowedEmail(email)).toBe(ok);
  });
});
