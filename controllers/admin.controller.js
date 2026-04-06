import User from "../models/User.js";
import LeaveType from "../models/LeaveType.js";

// =========================
// GET ALL USERS (ADMIN)
// =========================
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("firstName lastName email");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =========================
// GET ALL LEAVE TYPES (ADMIN)
// =========================
export const getAllLeaveTypes = async (req, res) => {
  try {
    const types = await LeaveType.find();
    res.json(types);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
