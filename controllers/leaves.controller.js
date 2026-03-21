// controllers/leaveType.controller.js
import LeaveType from "../models/Leaves.js";

// GET all leave types
export const getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find();
    res.status(200).json(leaveTypes);
  } catch (error) {
    res.status(500).json({ message: "Error fetching leave types" });
  }
};

// CREATE leave type
export const createLeaveType = async (req, res) => {
  try {
    const { name, type, maxDays, accrualRate } = req.body;

    const newLeaveType = new LeaveType({
      name,
      type,
      maxDays,
      accrualRate,
    });

    await newLeaveType.save();
    res.status(201).json(newLeaveType);
  } catch (error) {
    res.status(500).json({ message: "Error creating leave type" });
  }
};

// DELETE
export const deleteLeaveType = async (req, res) => {
  try {
    await LeaveType.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting" });
  }
};

