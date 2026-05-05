import express from "express";
import multer from "multer";

import {
  applyLeave,
  getLeaveTypes,
  getMyLeaves,
  getPendingLeaves,
  updateLeaveStatus,
} from "../controllers/leave.controller.js";

import { protect, requireManager } from "../middleware/auth.middleware.js";

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

// Leave types (public or authenticated)
router.get("/types", getLeaveTypes);

// My leaves (employee)
router.get("/my-leaves", protect, getMyLeaves);

// Apply leave
router.post("/apply", protect, upload.single("attachment"), applyLeave);

// Manager only
router.get("/pending", protect, requireManager, getPendingLeaves);
router.put("/:id/status", protect, requireManager, updateLeaveStatus);

export default router;














