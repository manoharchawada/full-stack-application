import mongoose, { Schema } from "mongoose";
const videoLikesSchema = Schema(
  {
    videoId: {
      type: Schema.Types.ObjectId,
      ref: "video",
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const VideoLike = mongoose.model("VideoLike", videoLikesSchema);
