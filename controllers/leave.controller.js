import mongoose from "mongoose";
import Leave from "../models/LeaveRequest.js";
import Entitlement from "../models/Entitlement.js";
import LeaveType from "../models/LeaveType.js";
import User from "../models/User.js";

// ============================
// 🔐 SAFE USER ID HELPER
// ============================
const getUserId = (req) => {
  return req.user?._id || req.user?.id || req.user;
};

// ============================
// 🔥 SAFE OBJECT ID COMPARE
// ============================
const isSameId = (a, b) => {
  if (!a || !b) return false;
  return a.toString() === b.toString();
};

// ============================
// ✅ APPLY LEAVE
// ============================
export const applyLeave = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { type, start, end, days, reason } = req.body;
    const attachment = req.file ? req.file.filename : null;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const leaveType = await LeaveType.findOne({ name: type });
    if (!leaveType) {
      return res.status(404).json({ message: "Leave type not found" });
    }

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

//getPendingLeaves//

 export const getPendingLeaves = async (req, res) => {
  try {
    const managerId = req.user?._id || req.user?.id || req.user;

    if (!managerId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // 1. Get ONLY employees under this manager
    const employees = await User.find({
      manager: managerId,
      role: "employee",
    }).select("_id");

    const employeeIds = employees.map((e) => e._id);

    // 2. If no employees → return empty
    if (employeeIds.length === 0) {
      return res.json([]);
    }

    // 3. STRICT FILTER: only pending + only manager's employees
    const leaves = await Leave.find({
      status: "Pending",
      user: { $in: employeeIds },
    })
      .populate("user", "firstName lastName email manager")
      .populate("leaveType", "name")
      .sort({ createdAt: -1 });

    // 4. Format response
    const formatted = leaves.map((l) => ({
      id: l._id,
      employee: `${l.user?.firstName || ""} ${l.user?.lastName || ""}`.trim(),
      email: l.user?.email || "",
      type: l.leaveType?.name || "Unknown",
      start: l.start,
      end: l.end,
      leaveDays: l.days,
      reason: l.reason,
      status: l.status,
      createdAt: l.createdAt,
    }));

    return res.json(formatted);
  } catch (err) {
    console.error("PENDING ERROR:", err);
    return res.status(500).json({ message: "Error fetching pending leaves" });
  }
};

// ============================
// ✅ UPDATE LEAVE STATUS
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

    if (!leave.user?.manager) {
      return res.status(403).json({ message: "Employee has no manager" });
    }

    if (!isSameId(leave.user.manager, managerId)) {
      return res.status(403).json({ message: "Not authorized" });
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
          message: `Not enough balance. Remaining: ${remaining}`,
        });
      }

      entitlement.usedDays += leave.days;
      await entitlement.save();
    }

    const updated = await Leave.findByIdAndUpdate(
      id,
      { status: newStatus, approvedBy: managerId },
      { new: true }
    );

    return res.json({
      message: `Leave ${newStatus.toLowerCase()} successfully`,
      leave: updated,
    });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================
// 📌 GET LEAVE TYPES
// ============================
export const getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find();
    return res.json(leaveTypes || []);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================
// 📌 GET MY LEAVES
// ============================
export const getMyLeaves = async (req, res) => {
  try {
    const userId = getUserId(req);

    const leaves = await Leave.find({ user: userId })
      .populate("leaveType", "name")
      .sort({ createdAt: -1 });

    return res.json(leaves || []);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================
// 📌 GET USER LEAVE TYPES (ENTITLEMENTS)
// ============================
export const getUserLeaveTypes = async (req, res) => {
  try {
    const userId = getUserId(req);

    const data = await Entitlement.find({ user: userId }).populate(
      "leaveType",
      "name totalDays"
    );

    return res.json(data || []);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================
// 📌 GET USER LEAVE HISTORY
// ============================
export const getUserLeaveHistory = async (req, res) => {
  try {
    const userId = getUserId(req);

    const leaves = await Leave.find({ user: userId })
      .populate("leaveType", "name")
      .populate("approvedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    const formatted = leaves.map((l) => ({
      id: l._id,
      type: l.leaveType?.name || "Unknown",
      start: l.start,
      end: l.end,
      days: l.days,
      reason: l.reason,
      status: l.status,
      approvedBy: l.approvedBy
        ? `${l.approvedBy.firstName} ${l.approvedBy.lastName}`
        : "-",
      createdAt: l.createdAt,
    }));

    return res.json(formatted);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
