import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { User } from "../models/user.models.js";
import { PlatformProfile } from "../models/user.models.js";
import { fetchCodeforcesData } from "../services/codeforces.service.js";
import { fetchLeetcodeRawData } from "../services/leetcode.service.js";
import { transformLeetcodeResponse } from "../transformers/leetcode.transformer.js";
import { transformCodeforcesResponse } from "../transformers/codeforces.transformer.js";
import { recomputeUserStats } from "../services/userStats.service.js";

const getPlatformUsername = (user, platformName) => {
  const entry = user.connectedPlatforms?.find(
    (p) => p.platform?.toLowerCase() === platformName.toLowerCase(),
  );
  const username = entry?.username?.trim() || user[`${platformName}Username`]?.trim();
  return username || null;
};

const syncPlatform = async ({
  userId,
  platform,
  username,
  fetchRaw,
  transform,
}) => {
  let transformed;

  try {
    const raw = await fetchRaw(username);
    transformed = transform(raw);
  } catch (err) {
    await PlatformProfile.findOneAndUpdate(
      { userId, platform, handle: username },
      { $set: { syncStatus: "failed" } },
    );
    throw err;
  }

  return PlatformProfile.findOneAndUpdate(
    { userId, platform },
    {
      $set: {
        handle: username,
        ...transformed,
        lastSyncedAt: new Date(),
        syncStatus: "success",
      },
    },
    { upsert: true, returnDocument: "after" },
  );
};

export const syncLeetcodeProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const leetcodeUsername = getPlatformUsername(user, "leetcode");
  if (!leetcodeUsername) {
    throw new ApiError(400, "No LeetCode username connected for this user");
  }

  const profile = await syncPlatform({
    userId: user._id,
    platform: "leetcode",
    username: leetcodeUsername,
    fetchRaw: fetchLeetcodeRawData,
    transform: transformLeetcodeResponse,
  });
  await recomputeUserStats(user._id);
  return res
    .status(200)
    .json(new ApiResponse(200, profile, "LeetCode profile synced"));
});

export const syncCodeforcesProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const codeforcesUsername = getPlatformUsername(user, "codeforces");
  if (!codeforcesUsername) {
    throw new ApiError(400, "No Codeforces username connected for this user");
  }

  const profile = await syncPlatform({
    userId: user._id,
    platform: "codeforces",
    username: codeforcesUsername,
    fetchRaw: fetchCodeforcesData,
    transform: transformCodeforcesResponse,
  });
  await recomputeUserStats(user._id);
  return res
    .status(200)
    .json(new ApiResponse(200, profile, "Codeforces profile synced"));
});

const platforms = {
  leetcode: { fetchRaw: fetchLeetcodeRawData, transform: transformLeetcodeResponse },
  codeforces: { fetchRaw: fetchCodeforcesData, transform: transformCodeforcesResponse },
};

const activeSyncs = new Map();
const noSyncNeeded = { attempted: 0, failed: 0, failedPlatforms: [] };
const platformNames = { leetcode: "LeetCode", codeforces: "Codeforces" };

async function syncConnectedProfiles(user, calendar) {
  const connected = Object.entries(platforms).flatMap(([platform, config]) => {
    const username = getPlatformUsername(user, platform);
    return username ? [{ userId: user._id, platform, username, ...config }] : [];
  });

  if (!connected.length && !calendar) {
    throw new ApiError(400, "No platforms connected for this user");
  }

  let due = connected;
  if (calendar && connected.length) {
    const now = new Date();
    const today = calendar.format(now);
    const previousAttempt = user.profileAutoSyncAttemptedAt;
    if (previousAttempt && calendar.format(previousAttempt) === today) return noSyncNeeded;

    // Reserve the daily attempt before calling upstream platforms, even if a sync later fails.
    const claim = await User.updateOne(
      { _id: user._id, profileAutoSyncAttemptedAt: previousAttempt ?? null },
      { $set: { profileAutoSyncAttemptedAt: now } },
    );
    if (!claim.matchedCount) return noSyncNeeded;

    const profiles = await PlatformProfile.find({
      userId: user._id,
      platform: { $in: connected.map(({ platform }) => platform) },
      syncStatus: "success",
    })
      .select("platform handle lastSyncedAt")
      .lean();
    due = connected.filter(({ platform, username }) => !profiles.some((profile) =>
      profile.platform === platform && profile.handle === username &&
      profile.lastSyncedAt && calendar.format(profile.lastSyncedAt) === today,
    ));
  }

  if (!due.length) return noSyncNeeded;
  const results = await Promise.allSettled(due.map(syncPlatform));
  const failures = results.flatMap((result, index) => result.status === "rejected"
    ? [{ platform: due[index].platform, reason: result.reason?.message }]
    : []);
  if (failures.length) {
    console.error("Some platform syncs failed:", failures);
  }
  await recomputeUserStats(user._id);
  return {
    attempted: due.length,
    failed: failures.length,
    failedPlatforms: failures.map(({ platform }) => platform),
  };
}

export const syncAllProfiles = asyncHandler(async (req, res) => {
  const { onlyIfDue, timeZone } = req.body ?? {};
  let calendar;
  if (onlyIfDue === true) {
    try {
      if (typeof timeZone !== "string" || !timeZone) throw new RangeError();
      calendar = new Intl.DateTimeFormat("en-CA", { dateStyle: "short", timeZone });
    } catch {
      throw new ApiError(400, "A valid time zone is required for daily sync.");
    }
  }

  const user = await User.findById(req.user._id).select("+profileAutoSyncAttemptedAt");
  if (!user) throw new ApiError(404, "User not found");

  const key = String(user._id);
  let active = activeSyncs.get(key);
  // A manual sync must still refresh every platform after an automatic sync.
  while (!calendar && active?.automatic) {
    await active.promise.catch(() => {});
    active = activeSyncs.get(key);
  }

  if (!active) {
    active = {
      automatic: Boolean(calendar),
      promise: syncConnectedProfiles(user, calendar).finally(() => activeSyncs.delete(key)),
    };
    activeSyncs.set(key, active);
  }
  const result = await active.promise;
  const message = result.failed
    ? `Could not sync ${result.failedPlatforms.map((platform) => platformNames[platform]).join(", ")}. You can try again.`
    : result.attempted ? "All platform profiles synced successfully" : "No profile sync needed";

  return res.status(200).json(new ApiResponse(200, result, message));
});

export const getUserStats = asyncHandler(async (req, res) => {
  const username = req.params.username || req.query.username;
  let user;
  if (username) {
    user = await User.findOne({ username });
  } else if (req.user?._id) {
    user = await User.findById(req.user._id);
  }
  if (!user) throw new ApiError(404, "User not found");

  if (!user.stats || !user.stats.lastSyncedAt) {
    await recomputeUserStats(user._id);
    user = await User.findById(user._id);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { stats: user.stats }, "User stats fetched"));
});

export const getSpecificPlatformData = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const username = req.params.username || req.query.username;

  const VALID_PLATFORMS = Object.keys(platforms);
  if (!VALID_PLATFORMS.includes(platform)) {
    throw new ApiError(
      400,
      `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(", ")}`,
    );
  }

  let user;
  if (username) {
    user = await User.findOne({ username });
  } else if (req.user?._id) {
    user = await User.findById(req.user._id);
  }

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const platformUsername = getPlatformUsername(user, platform);

  if (!platformUsername) {
    throw new ApiError(404, `No ${platform} username connected for this user.`);
  }

  let profile = await PlatformProfile.findOne({
    userId: user._id,
    platform,
  });

  // Only the signed-in owner may trigger a live sync. Public profile views read
  // stored data, so anonymous traffic can never make the server call LeetCode.
  const isOwner = req.user?._id && String(req.user._id) === String(user._id);

  if (
    isOwner &&
    req.query.cached !== "true" &&
    (!profile ||
      profile.syncStatus !== "success" ||
      profile.handle !== platformUsername ||
      !profile.stats?.activeDays)
  ) {
    const config = platforms[platform];
    if (config) {
      try {
        profile = await syncPlatform({
          userId: user._id,
          platform,
          username: platformUsername,
          fetchRaw: config.fetchRaw,
          transform: config.transform,
        });
        await recomputeUserStats(user._id);
      } catch (err) {
        console.error(
          `Auto-sync failed for ${platform} (${platformUsername}):`,
          err?.message || err,
        );
      }
    }
  }

  if (!profile || profile.handle !== platformUsername || (profile.syncStatus === "failed" && req.query.cached !== "true")) {
    throw new ApiError(
      404,
      `Failed to fetch ${platform} profile stats for username '${platformUsername}'.`,
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { profile },
        `${platform} profile data fetched successfully`,
      ),
    );
});
