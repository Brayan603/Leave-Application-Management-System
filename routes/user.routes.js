import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { protectAdmin, protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// ============================
// ✅ GET ALL USERS (ADMIN ONLY)
// ============================
router.get("/", protectAdmin, async (req, res) => {
  try {
    const users = await User.find();

    res.json(
      users.map((u) => ({
        id: u._id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role,
        manager: u.manager,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================
// ✅ GET MY EMPLOYEES (MANAGER)
// ============================
router.get("/my-employees", protect, async (req, res) => {
  try {
    const managerId = req.user?.id || req.user?._id || req.user;

    const employees = await User.find({
      manager: managerId,
      role: "employee",
    });

    res.json(
      employees.map((u) => ({
        id: u._id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role,
      }))
    );
  } catch (err) {
    console.error("MY EMPLOYEES ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============================
// 🔥 CREATE USER (FIXED LOGIC)
// ============================
router.post("/", protectAdmin, async (req, res) => {
  try {
    let { firstName, lastName, email, password, role, manager } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email: email.trim() });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    // ============================
    // 🔥 STRICT ROLE RULES
    // ============================

    // ❌ Managers should NEVER have a manager
    if (role === "manager") {
      manager = null;
    }

    // ❌ Employees MUST have a manager
    if (role === "employee" && !manager) {
      return res.status(400).json({
        message: "Employee must be assigned a manager",
      });
    }

    const user = await User.create({
      firstName,
      lastName,
      email: email.trim(),
      password: hashedPassword,
      role,
      manager: role === "employee" ? manager : null,
    });

    res.status(201).json({
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      manager: user.manager,
    });
  } catch (err) {
    console.error("CREATE USER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;

























