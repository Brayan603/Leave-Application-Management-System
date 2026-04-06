import express from "express";
import multer from "multer";

import {
  applyLeave,
  getLeaveTypes,
  getUserLeaveTypes,
  getUserLeaveHistory,
  getMyLeaves,
  getAllLeaves,
  getPendingLeaves,
  updateLeaveStatus,
} from "../controllers/leave.controller.js";

import { protect, requireManager } from "../middleware/auth.middleware.js"; 
// 👆 import the actual functions you exported

const router = express.Router();

// ============================
// 📁 MULTER CONFIG
// ============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// ============================
// 📌 ROUTES
// ============================

// Get all leave types
router.get("/types", getLeaveTypes);

// User-specific leave types
router.get("/my-leave-types", protect, getUserLeaveTypes);

// User leave history
router.get("/history", protect, getUserLeaveHistory);

// My leaves (alternative endpoint)
router.get("/my-leaves", protect, getMyLeaves);

// Admin all leaves
router.get("/all", protect, getAllLeaves);

// Apply leave
router.post("/apply", protect, upload.single("attachment"), applyLeave);

// Manager: pending leaves
router.get("/pending", protect, requireManager, getPendingLeaves);

// Manager: update leave status
router.put("/:id/status", protect, requireManager, updateLeaveStatus);

export default router;














