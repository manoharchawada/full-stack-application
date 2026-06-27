// | Method | Endpoint                   | Purpose                                                  |
// | ------ | -------------------------- | -------------------------------------------------------- |
// | POST   | `/comments/video/:videoId` | Add a comment to a video                                 |
// | GET    | `/comments/video/:videoId` | Get all comments for a video (with pagination if needed) |
// | PATCH  | `/comments/:commentId`     | Edit your own comment                                    |
// | DELETE | `/comments/:commentId`     | Delete your own comment                                  |

import mongoose from "mongoose";
import { Comment } from "../models/comments.models.js";
import { ApiError } from "../utils/apiErrors.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const createComment = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params;
    const { content, parentId } = req.body;
    if (!videoId) {
      return res.status(400).json(new ApiError(400, "VideoId is required"));
    }
    if (!content.trim()) {
      return res.status(400).json(new ApiError(400, "Content is required"));
    }
    const comment = await Comment.create({
      content,
      video: videoId,
      owner: req.user?._id,
      parentId: parentId ?? null,
    });
    if (!comment) {
      return res
        .status(500)
        .json(500, "Internal server error while creating comment");
    }
    return res
      .status(201)
      .json(new ApiResponse(201, comment, "Successfully comment on video"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, error?.message || "Something went wrong"));
  }
});

const getParentComments = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params;
    const { limit, offset } = req.query;
    console.log(limit, offset, "00000000");

    if (!videoId) {
      return res.status(400).json(new ApiError(400, "Id is required"));
    }
    const totalComments = await Comment.countDocuments({
      video: videoId,
    });

    const comments = await Comment.aggregate([
      {
        $match: {
          video: new mongoose.Types.ObjectId(videoId),
          parentId: null,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $skip: parseInt(offset) ?? 0,
      },
      { $limit: parseInt(limit) ?? 10 },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $project: {
                fullName: 1,
                username: 1,
                email: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "parentId",
          as: "childrenComment",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  {
                    $project: {
                      fullName: 1,
                      username: 1,
                      email: 1,
                      avatar: 1,
                    },
                  },
                ],
              },
            },
            {
              $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "parentId",
                as: "childrenComment",
                pipeline: [
                  {
                    $lookup: {
                      from: "users",
                      localField: "owner",
                      foreignField: "_id",
                      as: "owner",
                      pipeline: [
                        {
                          $project: {
                            fullName: 1,
                            username: 1,
                            email: 1,
                            avatar: 1,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ]);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { comments, totalComments },
          "Comment fetched successfully"
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          error?.message || "Internal server error while fetching video comment"
        )
      );
  }
});
const deleteReplies = async (parentId) => {
  const replies = await Comment.find({ parentId });

  for (const reply of replies) {
    await deleteReplies(reply._id);
    await reply.deleteOne();
  }
};
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    return res.status(400).json(new ApiError(400, "Invalid comment id"));
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    return res.status(404).json(new ApiError(404, "Comment not found"));
  }

  if (!comment.owner.equals(req.user._id)) {
    return res.status(403).json(new ApiError(403, "Unauthorized user"));
  }

  await deleteReplies(commentId);

  await comment.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});
export { createComment, getParentComments, deleteComment };
