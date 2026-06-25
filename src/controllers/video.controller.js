import mongoose from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/apiErrors.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { VideoLike } from "../models/video.likes.models.js";

const createVideo = asyncHandler(async (req, res) => {
  // get video meta from req.body
  // check empty
  // get files form temp
  // upload on cloudinary
  // file empty
  // save in db
  // return response to user

  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res
        .status(400)
        .json(new ApiError(400, "Video title and description are required"));
    }
    console.log(req.files.thumbnail.path, "files", req.files.videoFile.path);

    let thumbnailLocalPath;
    if (
      req.files &&
      Array.isArray(req.files?.thumbnail) &&
      req.files?.thumbnail[0].path
    ) {
      thumbnailLocalPath = req.files?.thumbnail[0].path;
    }
    if (!thumbnailLocalPath) {
      return res
        .status(400)
        .json(new ApiError(400, "Video thumbnail is required"));
    }
    let videoLocalPath;
    if (
      req.files &&
      Array.isArray(req.files?.videoFile) &&
      req.files?.videoFile[0].path
    ) {
      videoLocalPath = req.files?.videoFile[0].path;
    }
    if (!videoLocalPath) {
      return res.status(400).json(new ApiError(400, "Video file is required"));
    }
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    const video = await uploadOnCloudinary(videoLocalPath);
    console.log("thumbnail===", thumbnail);
    console.log("video===", video);
    if (!thumbnail) {
      return res
        .status(500)
        .json(
          new ApiError(
            500,
            "Internal server error while uploading video thumbnail"
          )
        );
    }
    if (!video) {
      return res
        .status(500)
        .json(new ApiError(500, "Internal server error while uploading video"));
    }
    const createdVideo = await Video.create({
      title,
      description,
      owner: req.user?._id,
      duration: video?.duration,
      videoFile: video?.url,
      thumbnail: thumbnail?.url,
    });

    const videoData = await Video.findById(createdVideo?._id);
    if (!videoData) {
      return res
        .status(500)
        .json(new ApiError(500, "Internal server error while creating video"));
    }
    return res
      .status(201)
      .json(new ApiResponse(201, videoData, "Video created successfully"));
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          error?.message ||
            "Internal server error while creating video in catch "
        )
      );
  }
});
const getVideoFeed = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = parseInt(req.query.offset);
  try {
    const videoFeed = await Video.find({})
      .sort({ createdAt: -1 })
      .limit(req.query.limit)
      .skip(req.query.offset)
      .select("-owner");
    if (!videoFeed?.length) {
      return res.status(404).json(new ApiError(404, "Video data not found"));
    }
    return res
      .status(200)
      .json(new ApiResponse(200, videoFeed, "Video fetched successfully"));
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(500, "Internal server error while fetching videos data")
      );
  }
});
const getSingleVideo = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params;
    if (!videoId) {
      return res.status(400).json(new ApiResponse(400, "VideoId is required"));
    }
    const videoData = await Video.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(videoId),
        },
      },
      {
        $lookup: {
          from: "videolikes",
          let: {
            videoId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$videoId", "$$videoId"],
                    },
                    {
                      $eq: [
                        "$likedBy",
                        new mongoose.Types.ObjectId(req.user._id),
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "likes",
        },
      },
      {
        $addFields: {
          isLiked: {
            $gt: [{ $size: "$likes" }, 0],
          },
        },
      },
      {
        $project: {
          likes: 0,
        },
      },
    ]);
    console.log("videoData====", videoData);
    return res
      .status(200)
      .json(
        new ApiResponse(200, videoData[0], "Video detail fetches successfully")
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          error?.message || "Internal server error while fetching video"
        )
      );
  }
});

const updateVideo = asyncHandler(async (req, res) => {
  try {
    const { title, description, videoId } = req.body;
    if (!videoId) {
      return res.status(400).json(new ApiError(400, "VideoId is required"));
    }
    const prevVideoData = await Video.findById(videoId);
    let thumbnailLocalPath;
    if (
      req.files &&
      Array.isArray(req.files?.thumbnail) &&
      req.files?.thumbnail[0].path
    ) {
      thumbnailLocalPath = req.files?.thumbnail[0].path;
    }
    let videoLocalPath;
    if (
      req.files &&
      Array.isArray(req.files?.videoFile) &&
      req.files?.videoFile[0].path
    ) {
      videoLocalPath = req.files?.videoFile[0].path;
    }
    let thumbnail;
    let video;
    if (thumbnailLocalPath) {
      thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    }
    if (videoLocalPath) {
      video = await uploadOnCloudinary(videoLocalPath);
    }
    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          title: title ?? prevVideoData?.title,
          description: description ?? prevVideoData?.description,
          videoFile: video?.url ?? prevVideoData?.videoFile,
          thumbnail: thumbnail?.url ?? prevVideoData?.thumbnail,
          duration: video?.duration ?? prevVideoData?.duration,
        },
      },
      { returnDocument: "after" }
    );
    if (thumbnail) {
      await deleteFromCloudinary(prevVideoData?.thumbnail);
    }
    if (video) {
      await deleteFromCloudinary(prevVideoData?.videoFile);
    }
    if (!updatedVideo) {
      return res
        .status(500)
        .json(new ApiError(500, "Internal server error while updating video"));
    }
    return res
      .status(200)
      .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, error?.message || "Something went wrong"));
  }
});
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  try {
    if (!videoId) {
      return res.status(400).json(new ApiError(400, "VideoId is required"));
    }
    const videoData = await Video.findById(videoId);
    if (!videoData) {
      return res.status(400).json(new ApiError(400, "Video not found"));
    }
    await deleteFromCloudinary(videoData?.videoFile);
    await deleteFromCloudinary(videoData?.thumbnail);
    await Video.findByIdAndDelete(videoId);
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Video deleted successfully"));
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          error?.message || "Internal server error while deleting video"
        )
      );
  }
});
const createPlaylist = asyncHandler(async (req, res) => {
  // get playlist title description
  // check empty
  // create playlist and return to user
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res
        .status(400)
        .json(new ApiError(400, "Title and description are required"));
    }
    const createdPlaylist = await Playlist.create({
      title,
      description,
      owner: req.user?._id,
    });
    const playlist = await Playlist.findById(createdPlaylist?._id);
    if (!playlist) {
      return res
        .status(500)
        .json(
          new ApiError(500, "Internal server error while creating playlist ")
        );
    }
    return res
      .status(201)
      .json(new ApiResponse(201, playlist, "Playlist created successfully"));
  } catch (error) {
    return res
      .status(400)
      .json(new ApiError(400, error?.message || "Something went wrong"));
  }
});
const addVideoInPlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { videoId } = req.body;
  if (!playlistId || !videoId) {
    return res
      .status(400)
      .json(new ApiError(400, "Playlist & videoId is required"));
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    return res.status(400).json(new ApiError(400, "Playlist not found"));
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $push: {
        video: videoId,
      },
    },
    { returnDocument: "after" }
  );
  if (!updatedPlaylist) {
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          "Internal server error while adding video in playlist"
        )
      );
  }
  return res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Video add successfully"));
});
const getUserPlaylist = asyncHandler(async (req, res) => {
  // check session
  // match _id in the playlist owner and get all
  try {
    // find 1 way ======
    const userPlaylist = await Playlist.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(req.user?._id),
        },
      },
    ]);

    // find 2 way =======
    //   const userPlaylist = await Playlist.aggregate([
    //   {
    //     $match: {
    //       owner: {
    //         $in: [new mongoose.Types.ObjectId(req.user?._id)],
    //       },
    //     },
    //   },
    // ]);

    // find 3rd way =========
    // const userPlaylist = await Playlist.find({
    //   owner: new mongoose.Types.ObjectId(req.user?._id),
    // });

    console.log("userPlaylist=====", userPlaylist);
    return res
      .status(200)
      .json(
        new ApiResponse(200, userPlaylist, "Playlist fetched successfully")
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, "Internal server error while fetching playlist"));
  }
});
const getPlaylistDetail = asyncHandler(async (req, res) => {
  try {
    const { playlistId } = req.params;
    const playlistDetail = await Playlist.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(playlistId),
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "video",
          foreignField: "_id",
          as: "video",
        },
      },
    ]);
    console.log(playlistDetail);

    if (!playlistDetail?.length) {
      return res.status(404).json(new ApiError(404, "Playlist not found"));
    }
    return res
      .status(200)
      .json(
        new ApiResponse(200, playlistDetail[0], "Playlist fetched successfully")
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          error?.message || "Internal server error while fetching playlist"
        )
      );
  }
});
const likeVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.body;
  if (!videoId) {
    return res.status(400).json(new ApiError(400, "VideoId is required"));
  }
  const existingLike = await VideoLike.findOne({
    videoId: videoId,
    likedBy: req.user?._id,
  });
  if (existingLike) {
    await VideoLike.findByIdAndDelete(existingLike?._id);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { _id: existingLike?._id },
          "Video Unlike successfully"
        )
      );
  }
  const videoLikes = await VideoLike.create({
    videoId,
    likedBy: req.user?._id,
  });
  return res
    .status(200)
    .json(
      new ApiResponse(200, { _id: videoLikes?._id }, "Video like successfully")
    );
});

export {
  createVideo,
  getVideoFeed,
  getSingleVideo,
  updateVideo,
  deleteVideo,
  createPlaylist,
  addVideoInPlaylist,
  getUserPlaylist,
  getPlaylistDetail,
  likeVideo,
};
