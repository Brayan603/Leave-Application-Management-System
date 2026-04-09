import express from "express";
import {
  getNotifications,
  createNotification,
} from "../controllers/notification.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getNotifications);

// ✅ ADD THIS
router.post("/", protect, createNotification);

export default router;
