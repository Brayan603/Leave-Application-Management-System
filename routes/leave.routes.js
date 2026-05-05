import express from "express";
import multer from "multer";

import {
  applyLeave,
  getLeaveTypes,
  getMyLeaves,
  getPendingLeaves,
  updateLeaveStatus,
  getUserLeaveTypes,
  getUserLeaveHistory, // ✅ ADD THIS
} from "../controllers/leave.controller.js";

import { protect, requireManager } from "../middleware/auth.middleware.js";

const router = express.Router();

// multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// routes
router.get("/types", getLeaveTypes);

router.get("/my-leaves", protect, getMyLeaves);

// 🔥 entitlement
router.get("/my-leave-types", protect, getUserLeaveTypes);

// 🔥 HISTORY (IMPORTANT)
router.get("/history", protect, getUserLeaveHistory);

router.post("/apply", protect, upload.single("attachment"), applyLeave);

router.get("/pending", protect, requireManager, getPendingLeaves);

router.put("/:id/status", protect, requireManager, updateLeaveStatus);

export default router;













