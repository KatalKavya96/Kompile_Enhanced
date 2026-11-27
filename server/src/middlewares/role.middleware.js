import { ApiError } from "../utils/api-error.js";

// Must run after verifyJWT. The role comes from the database user loaded by
// verifyJWT, never from the token or the request body.
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) throw new ApiError(401, "Unauthorized request");
  if (!roles.includes(req.user.role)) {
    throw new ApiError(403, "You do not have permission to perform this action.");
  }
  next();
};
