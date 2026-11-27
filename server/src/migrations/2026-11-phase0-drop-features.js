// Phase 0 cleanup: removes data for features dropped from Kompile
// (GitHub, GFG, HackerRank links, tech stack, social links, daily missions,
// login history). Idempotent. Dry run by default; pass --apply to write.
//
//   node src/migrations/2026-11-phase0-drop-features.js          # dry run
//   node src/migrations/2026-11-phase0-drop-features.js --apply  # write
//
// Take a database backup before running with --apply.
import "dotenv/config";
import mongoose from "mongoose";

const KEPT_PLATFORMS = ["leetcode", "codeforces"];
const DROPPED_COLLECTIONS = ["dailymissions", "userloginlogs"];

export async function runPhase0Migration(db, { apply = false } = {}) {
  const users = db.collection("users");
  const profiles = db.collection("platformprofiles");

  const userFilter = {
    $or: [
      { "connectedPlatforms.platform": { $nin: KEPT_PLATFORMS } },
      { techStack: { $exists: true } },
      { socialLinks: { $exists: true } },
    ],
  };
  const profileFilter = { platform: { $nin: KEPT_PLATFORMS } };

  const existing = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name),
  );
  const report = {
    usersToUpdate: await users.countDocuments(userFilter),
    profilesToDelete: await profiles.countDocuments(profileFilter),
    collectionsToDrop: DROPPED_COLLECTIONS.filter((name) => existing.has(name)),
    applied: apply,
  };
  if (!apply) return report;

  await users.updateMany(
    {},
    {
      $pull: { connectedPlatforms: { platform: { $nin: KEPT_PLATFORMS } } },
      $unset: { techStack: "", socialLinks: "" },
    },
  );
  await profiles.deleteMany(profileFilter);
  for (const name of report.collectionsToDrop) {
    await db.collection(name).drop();
  }
  return report;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());
if (isMain) {
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGO_URL);
  try {
    const report = await runPhase0Migration(mongoose.connection.db, { apply });
    console.log(JSON.stringify(report, null, 2));
    if (!apply) console.log("Dry run only. Re-run with --apply to write.");
  } finally {
    await mongoose.disconnect();
  }
}
