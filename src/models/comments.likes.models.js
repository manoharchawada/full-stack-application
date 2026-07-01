import mongoose, { Schema } from "mongoose";
const commentsLikesSchema = Schema(
  {
    Comment: { type: Schema.Types.ObjectId, ref: "Comment" },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timeSteps: true,
  }
);

export const CommentLikes = mongoose.model("CommentLikes", commentsLikesSchema);
