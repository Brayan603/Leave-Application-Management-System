import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ================= LOGIN =================
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // 2️⃣ Find user + include password
    const user = await User.findOne({ email: email.trim() }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3️⃣ Check password exists
    if (!user.password) {
      return res.status(500).json({ message: "User password not set" });
    }

    // 4️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 5️⃣ Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // 6️⃣ Response
    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error, please try again" });
  }
};
