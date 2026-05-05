import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ============================
// 🔐 AUTH MIDDLEWARE (SINGLE SOURCE OF TRUTH)
// ============================
export const authMiddleware = async (req, res, next) => {
  try {
    console.log("🔥 AUTH MIDDLEWARE HIT");

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("🔓 DECODED TOKEN:", decoded);

    // ✅ ALWAYS FETCH FULL USER FROM DB
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 🔥 STANDARDIZED req.user (CRITICAL FIX)
    req.user = user;

    console.log("👤 LOGGED IN USER:", {
      id: user._id,
      role: user.role,
      email: user.email,
    });

    next();
  } catch (err) {
    console.error("❌ AUTH ERROR:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ============================
// ✅ PROTECT ANY AUTHENTICATED USER
// ============================
export const protect = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    next();
  } catch (err) {
    console.error("PROTECT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================
// ✅ PROTECT ADMIN ROUTES
// ============================
export const protectAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    next();
  } catch (err) {
    console.error("ADMIN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================
// 👨‍💼 REQUIRE MANAGER ROLE
// ============================
export const requireManager = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Managers only" });
    }

    next();
  } catch (err) {
    console.error("MANAGER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

