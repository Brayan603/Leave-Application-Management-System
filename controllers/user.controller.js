import User from "../models/User.js";
import bcrypt from "bcryptjs";

const getUserId = (req) => req.user?.id || req.user?._id || req.user;

// ============================
// CREATE USER
// ============================
export const createUser = async (req, res) => {
  try {
    const {
      firstName, middleName, lastName,
      email, password, role,
      gender, dateOfBirth, age,
      countryOfBirth, countyOfBirth, currentCity,
      phoneNumber, manager, organization,
      department, subDepartment,
    } = req.body;

    const currentUserId = getUserId(req);
    const currentUser = await User.findById(currentUserId);

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email: email.trim() });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password.trim(), salt);

    let assignedManager = null;
    if (currentUser.role === "manager") {
      assignedManager = currentUserId;
    } else if (currentUser.role === "admin" && role === "employee") {
      assignedManager = manager || null;
    }

    const user = await User.create({
      firstName, middleName, lastName,
      email: email.trim(),
      password: hashedPassword,
      role,
      gender, dateOfBirth, age,
      countryOfBirth, countyOfBirth, currentCity,
      phoneNumber,
      manager: assignedManager,
      organization: organization || null,
      department: department || null,
      subDepartment: subDepartment || null,
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ============================
// UPDATE USER
// ============================
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      firstName, middleName, lastName,
      email, password, role,
      gender, dateOfBirth, age,
      countryOfBirth, countyOfBirth, currentCity,
      phoneNumber, manager, organization,
      department, subDepartment,
    } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password.trim(), salt);
    }

    user.firstName      = firstName      || user.firstName;
    user.middleName     = middleName     ?? user.middleName;
    user.lastName       = lastName       || user.lastName;
    user.email          = email          || user.email;
    user.role           = role           || user.role;
    user.gender         = gender         ?? user.gender;
    user.dateOfBirth    = dateOfBirth    ?? user.dateOfBirth;
    user.age            = age            ?? user.age;
    user.countryOfBirth = countryOfBirth ?? user.countryOfBirth;
    user.countyOfBirth  = countyOfBirth  ?? user.countyOfBirth;
    user.currentCity    = currentCity    ?? user.currentCity;
    user.phoneNumber    = phoneNumber    ?? user.phoneNumber;
    user.organization   = organization   || user.organization;
    user.department     = department     || user.department;
    user.subDepartment  = subDepartment  || user.subDepartment;
    user.manager        = manager        || user.manager;

    await user.save();

    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ============================
// GET ALL USERS
// ============================
export const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate("organization", "name")
      .populate("department", "name")
      .populate("subDepartment", "name")
      .populate("manager", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ============================
// GET TEAM OVERVIEW (MANAGER)
// ============================
export const getTeamOverview = async (req, res) => {
  try {
    const managerId = getUserId(req);
    if (!managerId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const employees = await User.find({ manager: managerId })
      .select("firstName lastName email role createdAt")
      .sort({ createdAt: -1 });

    return res.json(employees || []);
  } catch (error) {
    console.error("TEAM OVERVIEW ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

