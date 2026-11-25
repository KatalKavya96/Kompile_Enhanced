import { describe, expect, it } from "vitest";
import {
  contestStandings,
  findContestSubmission,
  leetcodeSlug,
} from "../../src/services/roomContest.service.js";

const at = (iso) => String(Date.parse(iso) / 1000);

describe("findContestSubmission", () => {
  const start = new Date("2026-11-25T10:00:00Z");
  const end = new Date("2026-11-25T11:00:00Z");

  it("ignores submissions made before the contest started", () => {
    const subs = [{ id: "1", titleSlug: "two-sum", timestamp: at("2026-11-25T09:59:59Z") }];
    expect(findContestSubmission(subs, "two-sum", start, end)).toBeUndefined();
  });

  it("ignores submissions at or after the end", () => {
    const subs = [{ id: "1", titleSlug: "two-sum", timestamp: at("2026-11-25T11:00:00Z") }];
    expect(findContestSubmission(subs, "two-sum", start, end)).toBeUndefined();
  });

  it("picks the earliest valid submission for the right problem", () => {
    const subs = [
      { id: "3", titleSlug: "two-sum", timestamp: at("2026-11-25T10:40:00Z") },
      { id: "2", titleSlug: "two-sum", timestamp: at("2026-11-25T10:10:00Z") },
      { id: "9", titleSlug: "other", timestamp: at("2026-11-25T10:05:00Z") },
    ];
    expect(findContestSubmission(subs, "two-sum", start, end).submissionId).toBe("2");
  });
});

describe("leetcodeSlug", () => {
  it.each([
    ["https://leetcode.com/problems/two-sum/", "two-sum"],
    ["http://leetcode.com/problems/two-sum/", null],
    ["https://leetcode.com.evil.com/problems/two-sum/", null],
    ["not a url", null],
  ])("%s -> %s", (link, slug) => expect(leetcodeSlug(link)).toBe(slug));
});

describe("contestStandings", () => {
  it("ranks by points, then earlier finish", () => {
    const t = (m) => new Date(`2026-11-25T10:${m}:00Z`);
    const rows = contestStandings([
      { userId: "a", username: "a", points: 3, submittedAt: t("10") },
      { userId: "b", username: "b", points: 3, submittedAt: t("05") },
      { userId: "c", username: "c", points: 1, submittedAt: t("01") },
    ]);
    expect(rows.map((r) => [r.username, r.rank])).toEqual([
      ["b", 1],
      ["a", 2],
      ["c", 3],
    ]);
  });
});
