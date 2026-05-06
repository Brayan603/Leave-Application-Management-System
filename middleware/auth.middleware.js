import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ============================
// 🔐 BASIC AUTH (FIXED)
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

    req.user = user;
    next();

  } catch (err) {
    console.error("PROTECT ERROR:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ============================
// 👑 ADMIN ONLY (FIXED)
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

    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Managers only" });
    }

    next();
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

    


