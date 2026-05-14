import express from "express";
import User from "../models/User.js";
import Leave from "../models/LeaveType.js";
import { protectAdmin, protect } from "../middleware/auth.middleware.js";
import { createUser, updateUser } from "../controllers/user.controller.js";

// Maintenance controllers
import {
  getUserDetails,
  closeUser,
  disableUser,
  enableUser,
  logoutUser,
  logoutAllUsers,
  reopenUser,
  resendCredential,
  authorizeUser,
} from "../controllers/userMaintenance.controller.js";

const router = express.Router();

// ========== Existing Routes ==========
router.post("/", protectAdmin, createUser);
router.put("/:id", protectAdmin, updateUser);

router.get("/", protectAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate("organization", "name")
      .populate("department", "name")
      .populate("manager", "firstName lastName email")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/managers/list", protectAdmin, async (req, res) => {
  try {
    const managers = await User.find({ role: "manager" }).select("_id firstName lastName email");
    res.json(managers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ========== NEW: User Search (for messenger) ==========
router.get("/search", protectAdmin, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ users: [] });

    const regex = new RegExp(q.trim(), "i");
    const users = await User.find({
      $or: [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        // combine first+last name search
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ["$firstName", " ", "$lastName"] },
              regex: q.trim(),
              options: "i",
            },
          },
        },
      ],
    })
      .select("firstName lastName email phone department")
      .limit(10)
      .lean();

    const formatted = users.map((u) => ({
      _id: u._id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      phone: u.phone,
      department: u.department,
    }));

    res.json({ users: formatted });
  } catch (err) {
    console.error("User search error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/my-employees", protect, async (req, res) => {
  try {
    const managerId = req.user?.id || req.user?._id || req.user;
    const employees = await User.find({ manager: managerId, role: "employee" });
    res.json(
      employees.map((u) => ({
        id: u._id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/employee/:id", protect, async (req, res) => {
  // ... your existing employee detail code (keep as is)
});

// ========== New Maintenance Routes ==========
// Note: order matters – place `/logout-all` before `/:userId` routes
router.post("/logout-all", protectAdmin, logoutAllUsers);

router.get("/:userId", protectAdmin, getUserDetails);
router.post("/:userId/close", protectAdmin, closeUser);
router.post("/:userId/disable", protectAdmin, disableUser);
router.post("/:userId/enable", protectAdmin, enableUser);
router.post("/:userId/logout", protectAdmin, logoutUser);
router.post("/:userId/reopen", protectAdmin, reopenUser);
router.post("/:userId/resend-credential", protectAdmin, resendCredential);
router.post("/:userId/authorize", protectAdmin, authorizeUser);

export default router;





















