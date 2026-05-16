import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ============================
// 🔐 BASIC AUTH
// ============================
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔥 ALWAYS fetch user from DB
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 🔥 Check token version - invalidates old tokens after disable/close
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== undefined) {
      if (decoded.tokenVersion !== user.tokenVersion) {
        return res.status(401).json({ 
          message: "Session expired. Please login again.",
          code: "TOKEN_EXPIRED"
        });
      }
    }

    // 🔒 Check if user is disabled
    if (user.status === "disabled") {
      return res.status(403).json({ 
        message: "Your account has been disabled. Please contact your administrator.",
        code: "ACCOUNT_DISABLED"
      });
    }

    // 🔒 Check if user is closed
    if (user.status === "closed") {
      return res.status(403).json({ 
        message: "Your account has been closed. Please contact your administrator.",
        code: "ACCOUNT_CLOSED"
      });
    }

    req.user = user;
    next();

  } catch (err) {
    console.error("PROTECT ERROR:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ============================
// 👑 ADMIN ONLY
// ============================
export const protectAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 🔥 Check token version
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== undefined) {
      if (decoded.tokenVersion !== user.tokenVersion) {
        return res.status(401).json({ 
          message: "Session expired. Please login again.",
          code: "TOKEN_EXPIRED"
        });
      }
    }

    // 🔒 Check if admin account is disabled or closed
    if (user.status === "disabled" || user.status === "closed") {
      return res.status(403).json({ 
        message: "Your account has been restricted. Please contact another administrator.",
        code: "ACCOUNT_RESTRICTED"
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    req.user = user;
    next();

  } catch (err) {
    console.error("ADMIN PROTECT ERROR:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ============================
// 👨‍💼 MANAGER ONLY
// ============================
export const requireManager = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // 🔒 Check if manager account is disabled or closed
    if (req.user.status === "disabled") {
      return res.status(403).json({ 
        message: "Your account has been disabled. Please contact your administrator.",
        code: "ACCOUNT_DISABLED"
      });
    }

    if (req.user.status === "closed") {
      return res.status(403).json({ 
        message: "Your account has been closed. Please contact your administrator.",
        code: "ACCOUNT_CLOSED"
      });
    }

    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Managers only" });
    }

    next();
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// Simple TTL cache (clears after 10 seconds)
const userCache = new Map();

const getCachedUser = async (userId) => {
  const now = Date.now();
  const cached = userCache.get(userId);
  if (cached && (now - cached.timestamp) < 10000) {
    return cached.user;
  }
  const user = await User.findById(userId);
  if (user) {
    userCache.set(userId, { user, timestamp: now });
  }
  return user;
};
    


