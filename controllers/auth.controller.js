// src/controllers/auth.controller.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // Do NOT populate, role is just a string
    const user = await User.findOne({ email: email.trim() }).select("+password");

    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    if (!user.password) return res.status(500).json({ message: "User password not set" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const roleName = user.role?.toLowerCase() || "employee"; // ✅ now works

    const token = jwt.sign({ id: user._id, role: roleName }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    });

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name || `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: roleName
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error, please try again" });
  }
};
