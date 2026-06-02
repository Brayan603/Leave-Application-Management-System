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
  getUserLeaveHistoryById,
  getManagerLeaves,
  getAllLeavesForAdmin,
  getAllLeavesSummary,
} from "../controllers/leave.controller.js";

// 🆕 Import holiday controllers
import {
  getHolidays,
  addHoliday,
  updateHoliday,
  deleteHoliday,
} from "../controllers/holiday.controller.js";

import { protect, protectAdmin, requireManager } from "../middleware/auth.middleware.js";

const router = express.Router();

// multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// ────────── Leave routes ──────────
router.get("/types", getLeaveTypes);
router.get("/my-leaves", protect, getMyLeaves);
router.get("/my-leave-types", protect, getUserLeaveTypes);
router.get("/history", protect, getUserLeaveHistory);
router.get("/history/:id", protect, requireManager, getUserLeaveHistoryById);
router.post("/apply", protect, upload.single("attachment"), applyLeave);
router.get("/pending", protect, requireManager, getPendingLeaves);
router.put("/:id/status", protect, requireManager, updateLeaveStatus);
router.get("/manager/leaves", protect, requireManager, getManagerLeaves);

// Admin-only leave routes
router.get("/admin/summary", protectAdmin, getAllLeavesSummary);
router.get("/admin/all", protectAdmin, getAllLeavesForAdmin);

// ────────── 🆕 Holiday routes ──────────
// GET holidays – accessible to any authenticated user
router.get("/holidays", protect, getHolidays);

// Admin-only holiday management
router.post("/holidays", protectAdmin, addHoliday);
router.put("/holidays/:id", protectAdmin, updateHoliday);
router.delete("/holidays/:id", protectAdmin, deleteHoliday);

export default router;















