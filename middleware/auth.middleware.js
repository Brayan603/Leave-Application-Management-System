import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ============================
// 🔐 GENERAL AUTH MIDDLEWARE (FIXED)
// ============================
export const authMiddleware = async (req, res, next) => {
  try {
    console.log("🔥 HEADERS:", req.headers.authorization);

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.log("❌ NO AUTH HEADER");
      return res.status(401).json({ message: "Not authorized (no header)" });
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.log("❌ BAD FORMAT:", authHeader);
      return res.status(401).json({ message: "Not authorized (bad format)" });
    }

    const token = authHeader.split(" ")[1];

    console.log("🔑 TOKEN:", token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("🔓 DECODED:", decoded);

    const user = await User.findById(decoded.id);

    if (!user) {
      console.log("❌ USER NOT FOUND");
      return res.status(401).json({ message: "Not authorized (no user)" });
    }

    req.user = user;

    console.log("👤 USER LOGGED IN:", user.email, user.role);

    next();
  } catch (err) {
    console.error("❌ AUTH ERROR:", err.message);
    return res.status(401).json({ message: "Not authorized (token error)" });
  }
};
