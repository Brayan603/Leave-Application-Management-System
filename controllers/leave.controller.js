import Leave from "../models/LeaveRequest.js";
import Entitlement from "../models/Entitlement.js";
import LeaveType from "../models/LeaveType.js";

// ============================
// 🔐 SAFE USER ID HELPER
// ============================
const getUserId = (req) => req.user?.id || req.user?._id || req.user;

// ============================
// ✅ APPLY LEAVE + AUTO DEDUCT (FIXED ❌ remove deduction here)
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

    // ❌ REMOVED: entitlement deduction here

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
// ✅ GET MY LEAVES
// ============================
export const getMyLeaves = async (req, res) => {
  try {
    const userId = getUserId(req);

    const leaves = await Leave.find({ user: userId })
      .populate("leaveType", "name")
      .sort({ createdAt: -1 });

    return res.json(leaves || []);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================
// ✅ GET ALL LEAVES (ADMIN)
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
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================
// ✅ GET LEAVE TYPES
// ============================
export const getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find();
    return res.json(leaveTypes || []);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================
// ✅ USER LEAVE TYPES
// ============================
export const getUserLeaveTypes = async (req, res) => {
  try {
    const userId = getUserId(req);

    const entitlements = await Entitlement.find({ user: userId })
      .populate("leaveType", "name totalDays");

    return res.json(entitlements || []);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================
// ✅ USER LEAVE HISTORY (EMPLOYEE)
// ============================
export const getUserLeaveHistory = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "User not authenticated" });

    const leaves = await Leave.find({ user: userId })
      .populate("leaveType", "name")
      .populate("approvedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    const formatted = (leaves || []).map((l) => ({
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
      attachment: l.attachment,
      createdAt: l.createdAt,
    }));

    return res.json(formatted);
  } catch (error) {
    console.error("HISTORY ERROR:", error);
    return res.status(500).json({ message: "Error fetching leave history" });
  }
};

// ============================
// ✅ GET PENDING LEAVES (MANAGER)
// ============================
export const getPendingLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ status: "Pending" })
      .populate("user", "firstName lastName email")
      .populate("leaveType", "name")
      .sort({ createdAt: -1 });

    const formatted = (leaves || []).map((l) => {
      const start = new Date(l.start);
      const end = new Date(l.end);
      const leaveDays =
        l.days || Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      return {
        id: l._id,
        employee: l.user
          ? `${l.user.firstName} ${l.user.lastName}`
          : "Unknown",
        email: l.user?.email || "",
        type: l.leaveType?.name || "Unknown",
        start: l.start,
        end: l.end,
        leaveDays,
        reason: l.reason,
        status: l.status,
        createdAt: l.createdAt,
      };
    });

    return res.json(formatted);
  } catch (err) {
    console.error("PENDING LEAVES ERROR:", err);
    return res.status(500).json({ message: "Error fetching pending leaves" });
  }
};

// ============================
// ✅ UPDATE LEAVE STATUS (APPROVE/REJECT)
// ============================
export const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const approverId = getUserId(req);

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const leave = await Leave.findById(id);

    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    const newStatus = action === "approve" ? "Approved" : "Rejected";

    // ============================
    // ✅ PREVENT DOUBLE APPROVAL
    // ============================
    if (leave.status === "Approved") {
      return res.status(400).json({ message: "Leave already approved" });
    }

    // ============================
    // ✅ ONLY DEDUCT IF APPROVED
    // ============================
    if (newStatus === "Approved") {
      const entitlement = await Entitlement.findOne({
        user: leave.user,
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
      { status: newStatus, approvedBy: approverId },
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

