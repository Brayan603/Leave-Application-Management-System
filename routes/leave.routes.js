import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import {
  applyLeave,
  getLeaveTypes,
  getMyLeaves,
  getPendingLeaves,
  updateLeaveStatus,
  getUserLeaveTypes,
  getUserLeaveHistory,
  getUserLeaveHistoryById,
  getManagerLeaves,
  getAllLeavesForAdmin,
  getAllLeavesSummary,
  getAttachment, // 🆕 new import
} from "../controllers/leave.controller.js";

import {
  getHolidays,
  addHoliday,
  updateHoliday,
  deleteHoliday,
} from "../controllers/holiday.controller.js";

import { protect, protectAdmin, requireManager } from "../middleware/auth.middleware.js";

const router = express.Router();

// ✅ Create uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("✅ Created uploads directory at", uploadDir);
}

// ✅ Multer configuration with safe filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const safeBase = baseName.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
    const uniquePrefix = Date.now() + "-";
    cb(null, uniquePrefix + safeBase + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ────────── Leave routes ──────────
router.get("/types", getLeaveTypes);
router.get("/my-leaves", protect, getMyLeaves);
router.get("/my-leave-types", protect, getUserLeaveTypes);
router.get("/history", protect, getUserLeaveHistory);
router.get("/history/:id", protect, requireManager, getUserLeaveHistoryById);
router.post("/apply", protect, upload.single("attachment"), applyLeave);
router.get("/pending", protect, requireManager, getPendingLeaves);

// 🆕 Attachment route (must be before /:id/status)
router.get("/attachment/:id", protect, getAttachment);

router.put("/:id/status", protect, requireManager, updateLeaveStatus);
router.get("/manager/leaves", protect, requireManager, getManagerLeaves);

// Admin-only leave routes
router.get("/admin/summary", protectAdmin, getAllLeavesSummary);
router.get("/admin/all", protectAdmin, getAllLeavesForAdmin);

// ────────── Holiday routes ──────────
router.get("/holidays", protect, getHolidays);
router.post("/holidays", protectAdmin, addHoliday);
router.put("/holidays/:id", protectAdmin, updateHoliday);
router.delete("/holidays/:id", protectAdmin, deleteHoliday);

export default router;














