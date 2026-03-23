import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { protectAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// Get all users (admin only)
router.get("/", protectAdmin, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users.map(u => ({
      id: u._id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      role: u.role
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create user (admin only)
router.post("/", protectAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email: email.trim() });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const user = await User.create({
      firstName,
      lastName,
      email: email.trim(),
      password: hashedPassword,
      role
    });

    res.status(201).json({
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

























