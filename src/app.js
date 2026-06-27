import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
const app = express();

// middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(
  express.json({
    limit: "16kb",
  })
);
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(express.static("public"));
app.use(cookieParser());
// router imports
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comments.routes.js";
// router declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/media", videoRouter);
app.use("/api/v1/videoComments", commentRouter);

export { app };
