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
  getUserLeaveHistoryById, // ✅ include this new controller
} from "../controllers/leave.controller.js";

import { protect, protectAdmin, requireManager } from "../middleware/auth.middleware.js";

const router = express.Router();

// multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// routes
router.get("/types", getLeaveTypes);

router.get("/my-leaves", protect, getMyLeaves);

router.get("/my-leave-types", protect, getUserLeaveTypes);

router.get("/history", protect, getUserLeaveHistory);

// Managers/Admins can view history for a specific employee
router.get("/history/:id", protect, requireManager, getUserLeaveHistoryById);

router.post("/apply", protect, upload.single("attachment"), applyLeave);

router.get("/pending", protect, requireManager, getPendingLeaves);

router.put("/:id/status", protect, requireManager, updateLeaveStatus);
router.get("/manager/leaves", protect, requireManager, getManagerLeaves);

export default router;















