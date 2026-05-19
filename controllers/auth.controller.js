import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import notificationService from "../services/notificationService.js";

export const loginUser = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ message: "Request body is missing" });
    }

    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required!" });
    }

    email = email.trim().toLowerCase();
    password = password.trim();

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid Credentials!" });
    }

    // 🔒 Check if user account is disabled
    if (user.status === "disabled") {
      return res.status(403).json({ 
        message: "Your account has been disabled. Please contact your system administrator.",
        code: "ACCOUNT_DISABLED"
      });
    }

    // 🔒 Check if user account is closed
    if (user.status === "closed") {
      return res.status(403).json({ 
        message: "Your account has been closed. Please contact your system administrator.",
        code: "ACCOUNT_CLOSED"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        tokenVersion: user.tokenVersion || 0,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });

    // Inside login function, after saving token/user
try {
  const notificationService = (await import("../services/notificationService.js")).default;
  await notificationService.send({
    recipientId: user._id,
    recipientEmail: null,           // no email for login
    recipientPhone: null,
    senderId: null,
    senderName: "System",
    type: "login_success",
    title: "Logged in",
    message: "You have logged in successfully.",
    channels: ["in_app"],          // only in-app notification
    priority: "low",
    metadata: {},
    io: req.app.get("io"),
  });
} catch (err) {
  console.error("Login notification error:", err.message);
}

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
