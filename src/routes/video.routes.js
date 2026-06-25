import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addVideoInPlaylist,
  createPlaylist,
  createVideo,
  deleteVideo,
  getPlaylistDetail,
  getSingleVideo,
  getUserPlaylist,
  getVideoFeed,
  likeVideo,
  updateVideo,
} from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/create-video").post(
  upload.fields([
    {
      name: "thumbnail",
      maxCount: 1,
    },
    {
      name: "videoFile",
      maxCount: 1,
    },
  ]),
  verifyJWT,
  createVideo
);
router.route("/video-feed").get(verifyJWT, getVideoFeed);
router.route("/create-playlist").post(verifyJWT, createPlaylist);
router.route("/update-video").patch(
  upload.fields([
    {
      name: "thumbnail",
      maxCount: 1,
    },
    { name: "videoFile", maxCount: 1 },
  ]),
  verifyJWT,
  updateVideo
);
router.route("/delete-video/:videoId").post(verifyJWT, deleteVideo);
router
  .route("/add-video-playlist/:playlistId")
  .post(verifyJWT, addVideoInPlaylist);
router.route("/user-playlist").get(verifyJWT, getUserPlaylist);
router.route("/playlist-detail/:playlistId").get(verifyJWT, getPlaylistDetail);
router.route("/video-like-unlike").post(verifyJWT, likeVideo);
router.route("/video-detail/:videoId").get(verifyJWT, getSingleVideo);
export default router;
