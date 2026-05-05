import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ============================
// 🔐 General Auth Middleware
// ============================
export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("AUTH ERROR:", err);
    res.status(401).json({ message: "Invalid token" });
  }
};

// ============================
// ✅ Protect Admin Routes
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
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("ADMIN PROTECT ERROR:", err);
    res.status(401).json({ message: "Not authorized" });
  }
};

// ============================
// ✅ Protect Any Authenticated User
// ============================
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("PROTECT ERROR:", err);
    res.status(401).json({ message: "Not authorized" });
  }
};

// ============================
// ✅ Require Manager Role
// ============================
export const requireManager = (req, res, next) => {
  try {
    if (!req.user?.role) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Managers only" });
    }

    next();
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

    


