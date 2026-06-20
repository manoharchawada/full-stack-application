import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiErrors.js";
import { User } from "../models/user.models.js";

const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // fetch the token from cookie or head
    // check token if not exist then throw error
    // decode the token with jwt verify method
    // fetch user from db by id
    // after fetch add the user in req.user = user then next()
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer", "");
    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }
    const decodedToken = await jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});

export { verifyJWT };
