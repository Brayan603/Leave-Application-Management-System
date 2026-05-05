import mongoose from "mongoose";
import Leave from "../models/LeaveRequest.js";
import Entitlement from "../models/Entitlement.js";
import LeaveType from "../models/LeaveType.js";
import User from "../models/User.js";

// ============================
// 🔐 SAFE USER ID HELPER
// ============================
const getUserId = (req) => req.user?.id || req.user?._id || req.user;

// 🔥 SAFE OBJECTID COMPARISON HELPER
const isSameId = (id1, id2) => {
  return id1 && id2 && id1.toString() === id2.toString();
};

// ============================
// ✅ APPLY LEAVE (UNCHANGED LOGIC)
// ============================
export const applyLeave = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { type, start, end, days, reason } = req.body;
    const attachment = req.file ? req.file.filename : null;

    if (!userId) return res.status(401).json({ message: "User not authenticated" });

    const leaveType = await LeaveType.findOne({ name: type });
    if (!leaveType) return res.status(404).json({ message: "Leave type not found" });

    const entitlement = await Entitlement.findOne({
      user: userId,
      leaveType: leaveType._id,
    });

    if (!entitlement) {
      return res.status(400).json({ message: "Not entitled to this leave type" });
    }

    const remaining = entitlement.totalDays - entitlement.usedDays;

    if (Number(days) > remaining) {
      return res.status(400).json({
        message: `Insufficient balance. Remaining: ${remaining}`,
      });
    }

    const leave = await Leave.create({
      user: userId,
      leaveType: leaveType._id,
      start,
      end,
      days: Number(days),
      reason,
      attachment,
      status: "Pending",
    });

    return res.status(201).json({
      message: "Leave applied successfully",
      leave,
    });
  } catch (err) {
    console.error("APPLY LEAVE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================
// ✅ GET PENDING LEAVES (MANAGER SAFE FIX)
// ============================
export const getPendingLeaves = async (req, res) => {
  try {
    const managerId = getUserId(req);

    if (!managerId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const employees = await User.find({
      manager: managerId,
      role: "employee",
    }).select("_id");

    const employeeIds = employees.map((emp) => emp._id);

    if (employeeIds.length === 0) {
      return res.json([]);
    }

    const leaves = await Leave.find({
      status: "Pending",
      user: { $in: employeeIds },
    })
      .populate("user", "firstName lastName email manager")
      .populate("leaveType", "name")
      .sort({ createdAt: -1 });

    const formatted = leaves.map((l) => ({
      id: l._id,
      employee: l.user
        ? `${l.user.firstName} ${l.user.lastName}`
        : "Unknown",
      email: l.user?.email || "",
      type: l.leaveType?.name || "Unknown",
      start: l.start,
      end: l.end,
      leaveDays:
        l.days ||
        Math.ceil((new Date(l.end) - new Date(l.start)) / (1000 * 60 * 60 * 24)) + 1,
      reason: l.reason,
      status: l.status,
      createdAt: l.createdAt,
    }));

    return res.json(formatted);
  } catch (err) {
    console.error("PENDING LEAVES ERROR:", err);
    return res.status(500).json({ message: "Error fetching pending leaves" });
  }
};

// ============================
// ✅ UPDATE LEAVE STATUS (FIXED MANAGER CHECK)
// ============================
export const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    const managerId = getUserId(req);

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const leave = await Leave.findById(id).populate("user");

    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    // 🔥 SAFE CHECK (FIXED)
    if (!leave.user?.manager) {
      return res.status(403).json({ message: "Employee has no manager assigned" });
    }

    if (!isSameId(leave.user.manager, managerId)) {
      return res.status(403).json({
        message: "You are not authorized to manage this leave",
      });
    }

    if (leave.status === "Approved") {
      return res.status(400).json({ message: "Leave already approved" });
    }

    const newStatus = action === "approve" ? "Approved" : "Rejected";

    if (newStatus === "Approved") {
      const entitlement = await Entitlement.findOne({
        user: leave.user._id,
        leaveType: leave.leaveType,
      });

      if (!entitlement) {
        return res.status(400).json({ message: "Entitlement not found" });
      }

      const remaining = entitlement.totalDays - entitlement.usedDays;

      if (leave.days > remaining) {
        return res.status(400).json({
          message: `Not enough leave balance. Remaining: ${remaining}`,
        });
      }

      entitlement.usedDays += leave.days;
      await entitlement.save();
    }

    const updatedLeave = await Leave.findByIdAndUpdate(
      id,
      {
        status: newStatus,
        approvedBy: managerId,
      },
      { new: true }
    )
      .populate("user", "firstName lastName email")
      .populate("leaveType", "name")
      .populate("approvedBy", "firstName lastName email");

    return res.json({
      message: `Leave ${newStatus.toLowerCase()} successfully`,
      leave: updatedLeave,
    });
  } catch (err) {
    console.error("UPDATE LEAVE STATUS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================
// (OTHER FUNCTIONS UNCHANGED)
// ============================
export const getAllLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find()
      .populate("user", "firstName lastName email")
      .populate("leaveType", "name")
      .populate("approvedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    return res.json(leaves || []);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find();
    return res.json(leaveTypes || []);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getMyLeaves = async (req, res) => {
  try {
    const userId = getUserId(req);

    const leaves = await Leave.find({ user: userId })
      .populate("leaveType", "name")
      .sort({ createdAt: -1 });

    return res.json(leaves || []);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};
