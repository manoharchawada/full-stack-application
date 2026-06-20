import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiErrors.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshTokenToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          "Something went wrong while generating refresh and access token"
        )
      );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res
  try {
    const { fullName, username, email, password } = req.body;
    if (
      [fullName, username, email, password].some((field) => field?.trim === " ")
    ) {
      res.status(400).json(new ApiError(400, "All field are required!"));
    }
    const existedUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existedUser) {
      throw new ApiError(
        400,
        "User already exist with this email and username"
      );
    }
    let avatarLocalPath;
    if (
      req.files &&
      Array.isArray(req.files.avatar) &&
      req.files?.avatar[0].path
    ) {
      avatarLocalPath = req.files?.avatar[0].path;
    }
    // const coverImageLocalPath = req.files?.coverImage[0].path;
    let coverImageLocalPath;
    if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files?.coverImage[0].path
    ) {
      coverImageLocalPath = req.files?.coverImage[0].path;
    }

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    let coverImage;
    if (coverImageLocalPath) {
      coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }
    if (!avatar) {
      throw new ApiError(500, "Internal Server Error while uploading avatar");
    }

    const user = await User.create({
      fullName,
      username: username.toLowerCase(),
      email,
      password,
      avatar: avatar?.url || "",
      coverImage: coverImage?.url || "",
    });
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );
    if (!createdUser) {
      throw new ApiError(500, "Internal Server Error while creating the user");
    }
    res
      .status(201)
      .json(new ApiResponse(201, createdUser, "User created successfully"));
  } catch (error) {
    res
      .status(500)
      .json(new ApiError(500, error?.message || "Internal server error"));
  }
});
const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  // username or email
  //find the user
  //password check
  //access and refresh token
  //send cookie
  const { username, email, password } = req.body;
  if (!username && !email) {
    throw new ApiError(401, "Username or Email is required");
  }
  console.log(email, username);
  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) {
    // res.status(404).json({ message: "user not found " });
    res.status(404).json(new ApiError(404, "User not found"));
  }
  if (user?.deletedAt !== null) {
    res.status(404).json(new ApiError(404, "User deleted from DB"));
  }
  const isPasswordValid = user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    res.status(404).json(new ApiError(404, "Invalid credentials "));
  }
  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: { accessToken, refreshToken, loggedInUser } },
        "User logged in successfully"
      )
    );
});
const logoutUser = asyncHandler(async (req, res) => {
  //fetch user from req.user
  // find user by there id
  // update the refreshToken field in db
  // delete the cookie

  const user = await User.findByIdAndUpdate(
    req?.user?._id,
    {
      $set: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "logged out successfully"));
});
const deleteUser = asyncHandler(async (req, res) => {
  try {
    // get user id from params
    // delete user from db
    await User.findByIdAndUpdate(req.user?._id, {
      $set: {
        deletedAt: Date.now(),
      },
    });
    const options = {
      httpOnly: true,
      secure: true,
    };
    res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User deleted successfully"));
  } catch (error) {
    res
      .status(401)
      .json(new ApiError(401, error?.message || "Unauthorized token"));
  }
});
const refreshAccessToken = asyncHandler(async (req, res) => {
  // take incoming token from cookie or body
  // if not then throw error
  // verify token
  // get user by token
  // if valid then generate new token and return
  const incomingRefreshToken =
    req?.cookies?.refreshToken || req.body?.refreshToken;
  console.log(req?.cookies?.refreshToken);

  if (!incomingRefreshToken) {
    res.status(401).json(new ApiError(401, "Incoming token not found"));
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      res.status(401).json(new ApiError(401, "Unauthorized request"));
    }
    if (incomingRefreshToken !== user.refreshToken) {
      res.status(401).json(401, "Unauthorized token");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(user?._id);
    res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", refreshToken)
      .json(
        new ApiResponse(200, {
          accessToken,
          refreshToken,
        })
      );
  } catch (error) {
    res
      .status(401)
      .json(new ApiError(401, error?.message || "Unauthorized token"));
  }
});

export { registerUser, loginUser, logoutUser, deleteUser, refreshAccessToken };
