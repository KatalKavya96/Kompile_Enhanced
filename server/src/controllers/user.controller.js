import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { User } from "../models/user.models.js";

const updateBasicInfo = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    bio,
    country,
    college,
    degree,
    branch,
    graduationYear,
    leetcodeUsername,
    leetcodeusername,
    codeforcesUsername,
    codeforcesusername,
  } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (firstName !== undefined)
    user.fullname = `${firstName} ${lastName || ""}`.trim();
  if (bio !== undefined) user.bio = bio;
  if (country !== undefined) user.country = country;

  //education
  if (!user.education) user.education = {};
  if (college !== undefined) user.education.institution = college;
  if (degree !== undefined) user.education.degree = degree;
  if (branch !== undefined) user.education.branch = branch;
  if (graduationYear !== undefined) {
    const num = Number(graduationYear);
    user.education.graduationYear =
      graduationYear && !isNaN(num) ? num : undefined;
  }

  // Upsert connected platforms
  const finalLeetcode =
    leetcodeUsername !== undefined ? leetcodeUsername : leetcodeusername;
  const finalCodeforces =
    codeforcesUsername !== undefined ? codeforcesUsername : codeforcesusername;

  const platformUpdates = [
    { key: "leetcode", username: finalLeetcode },
    { key: "codeforces", username: finalCodeforces },
  ];

  for (const { key, username } of platformUpdates) {
    if (username === undefined) continue;
    if (typeof username !== "string") {
      throw new ApiError(400, `${key} username must be a string`);
    }
    const handle = username.trim();
    const existing = user.connectedPlatforms.find((p) => p.platform === key);
    if (existing) {
      existing.username = handle;
    } else if (handle) {
      user.connectedPlatforms.push({ platform: key, username: handle });
    }
  }

  await user.save({ validateBeforeSave: false });

  const updatedUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry",
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: updatedUser },
        "Basic info updated successfully",
      ),
    );
});

const getBasicInfo = asyncHandler(async (req, res) => {
  const username = req.params.username || req.user?.username;
  let user;
  if (username) {
    user = await User.findOne({ username }).select(
      "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry",
    );
  } else if (req.user?._id) {
    user = await User.findById(req.user._id).select(
      "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry",
    );
  }
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "Basic info fetched successfully"));
});

const getUserData = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const user = await User.findOne({ username }).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry",
  );
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "User data fetched successfully"));
});

export { updateBasicInfo, getBasicInfo, getUserData };
