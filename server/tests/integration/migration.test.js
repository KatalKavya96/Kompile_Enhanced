import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { runPhase0Migration } from "../../src/migrations/2026-11-phase0-drop-features.js";
import { connectTestDb, disconnectTestDb } from "../helpers.js";

beforeAll(() => connectTestDb("migration"));
afterAll(() => disconnectTestDb());

describe("phase 0 migration", () => {
  it("dry run changes nothing; apply cleans up; a second run is a no-op", async () => {
    const db = mongoose.connection.db;
    await db.collection("users").insertOne({
      email: "a@nst.rishihood.edu.in",
      techStack: ["React"],
      socialLinks: { linkedin: "x" },
      connectedPlatforms: [
        { platform: "leetcode", username: "lc" },
        { platform: "github", username: "gh" },
        { platform: "gfg", username: "g" },
      ],
    });
    await db.collection("platformprofiles").insertMany([
      { platform: "leetcode", handle: "lc" },
      { platform: "github", handle: "gh" },
    ]);
    await db.collection("dailymissions").insertOne({ title: "x" });

    const dry = await runPhase0Migration(db);
    expect(dry).toMatchObject({ usersToUpdate: 1, profilesToDelete: 1, applied: false });
    expect(dry.collectionsToDrop).toEqual(["dailymissions"]);
    expect(await db.collection("platformprofiles").countDocuments()).toBe(2);

    await runPhase0Migration(db, { apply: true });
    const user = await db.collection("users").findOne({});
    expect(user.connectedPlatforms).toEqual([{ platform: "leetcode", username: "lc" }]);
    expect(user.techStack).toBeUndefined();
    expect(user.socialLinks).toBeUndefined();
    expect(await db.collection("platformprofiles").countDocuments()).toBe(1);
    const names = (await db.listCollections().toArray()).map((c) => c.name);
    expect(names).not.toContain("dailymissions");

    const again = await runPhase0Migration(db);
    expect(again).toMatchObject({ usersToUpdate: 0, profilesToDelete: 0, collectionsToDrop: [] });
  });
});
