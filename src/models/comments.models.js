import mongoose, { Schema } from "mongoose";
const commentsSchema = Schema(
  {
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Comment = mongoose.model("Comment", commentsSchema);
