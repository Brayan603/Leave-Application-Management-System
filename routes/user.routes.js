import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { protectAdmin } from "../middleware/auth.middleware.js";
import { protect } from "../middleware/auth.middleware.js"; // 🔥 for logged-in users

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

    // 🔥 ONLY employees under this manager
    const employees = await User.find({
      manager: managerId,
      role: "employee", // ensures only employees
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
// ✅ CREATE USER (ADMIN ONLY)
// ============================
router.post("/", protectAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, manager } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email: email.trim() });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const user = await User.create({
      firstName,
      lastName,
      email: email.trim(),
      password: hashedPassword,
      role,
      manager: manager || null, // 🔥 allow admin to assign manager
    });

    res.status(201).json({
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      manager: user.manager,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

























