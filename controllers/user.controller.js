// controllers/userController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";

// 🔐 helper
const getUserId = (req) => req.user?.id || req.user?._id || req.user;

// ============================
// ✅ CREATE USER (WITH MANAGER FILTERING)
// ============================
export const createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      manager,
      organization,   // ✅ added
      department      // ✅ added
    } = req.body;

    const currentUserId = getUserId(req);
    const currentUser = await User.findById(currentUserId);

    // 1️⃣ Validate fields
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2️⃣ Check existing user
    const existingUser = await User.findOne({ email: email.trim() });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 3️⃣ Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password.trim(), salt);

    // ============================
    // 🔥 MANAGER ASSIGNMENT LOGIC
    // ============================
     let assignedManager = null;
      
      // manager creating employee
      if (currentUser.role === "manager") {
        assignedManager = currentUserId;
      }
      
      // admin selects manager manually
      else if (currentUser.role === "admin") {
        // only employees should have managers
        if (role === "employee") {
          assignedManager = manager || null;
        }
      }

    // 4️⃣ Create user
    const user = await User.create({
      firstName,
      lastName,
      email: email.trim(),
      password: hashedPassword,
      role,
      manager: assignedManager,

      // ✅ IMPORTANT FIX
      organization: organization || null,
      department: department || null,
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        manager: user.manager,
        organization: user.organization, // optional but helpful
        department: user.department,     // optional but helpful
      },
    });

  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ============================
// ✅ GET TEAM OVERVIEW (MANAGER ONLY)
// ============================
export const getTeamOverview = async (req, res) => {
  try {
    const managerId = req.user?.id || req.user?._id || req.user;

    if (!managerId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // 🔥 ONLY employees assigned to this manager
    const employees = await User.find({ manager: managerId })
      .select("firstName lastName email role createdAt")
      .sort({ createdAt: -1 });

    return res.json(employees || []);
  } catch (error) {
    console.error("TEAM OVERVIEW ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


