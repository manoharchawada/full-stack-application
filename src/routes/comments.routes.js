import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createComment,
  getParentComments,
} from "../controllers/comment.controller.js";

const router = Router();
router.route("/comment/:videoId").post(verifyJWT, createComment);
router.route("/parent-comment/:videoId").get(verifyJWT, getParentComments);
export default router;
