import express from "express";
import multer from "multer";
import {
  applyLeave,
  getLeaveTypes,
  getMyLeaves,
  getPendingLeaves,
  updateLeaveStatus,
  getUserLeaveTypes,
  getUserLeaveHistory,
} from "../controllers/leave.controller.js";

import { authMiddleware, protect, requireManager } from "../middleware/auth.middleware.js";

const router = express.Router();

// multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// routes
router.get("/types", getLeaveTypes);
router.get("/my-leaves", authMiddleware, protect, getMyLeaves);
router.get("/my-leave-types", authMiddleware, protect, getUserLeaveTypes);
router.get("/history", authMiddleware, protect, getUserLeaveHistory);
router.post("/apply", authMiddleware, protect, upload.single("attachment"), applyLeave);
router.get("/pending", authMiddleware, protect, requireManager, getPendingLeaves);
router.put("/:id/status", authMiddleware, protect, requireManager, updateLeaveStatus);

export default router;














