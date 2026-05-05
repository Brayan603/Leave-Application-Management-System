import Leave from "../models/LeaveRequest.js";
import Entitlement from "../models/Entitlement.js";
import LeaveType from "../models/LeaveType.js";
import User from "../models/User.js"; // ✅ needed for manager filtering

// ============================
// 🔐 SAFE USER ID HELPER
// ============================
const getUserId = (req) => req.user?.id || req.user?._id || req.user;

// ============================
// ✅ APPLY LEAVE
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
// ✅ GET PENDING LEAVES (MANAGER FILTERED ONLY)
// ============================
export const getPendingLeaves = async (req, res) => {
  try {
    const managerId = getUserId(req);

    if (!managerId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // 🔥 Get employees under this manager
    const employees = await User.find({ manager: managerId }).select("_id");

    const employeeIds = employees.map((emp) => emp._id);

    if (employeeIds.length === 0) {
      return res.json([]); // no employees
    }

    // 🔥 Get ONLY their pending leaves
    const leaves = await Leave.find({
      status: "Pending",
      user: { $in: employeeIds },
    })
      .populate("user", "firstName lastName email")
      .populate("leaveType", "name")
      .sort({ createdAt: -1 });

    const formatted = leaves.map((l) => {
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
// ✅ UPDATE LEAVE STATUS (SECURED FOR MANAGER)
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

    // 🔐 SECURITY: ensure employee belongs to this manager
    if (leave.user.manager?.toString() !== managerId.toString()) {
      return res.status(403).json({
        message: "Not authorized to approve this leave",
      });
    }

    if (leave.status === "Approved") {
      return res.status(400).json({ message: "Leave already approved" });
    }

    const newStatus = action === "approve" ? "Approved" : "Rejected";

    // ✅ Deduct ONLY when approved
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
      { status: newStatus, approvedBy: managerId },
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
    console.error("GET LEAVE TYPES ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================
// ✅ GET MY LEAVES
// ============================
export const getMyLeaves = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;

    const leaves = await Leave.find({ user: userId })
      .populate("leaveType", "name")
      .sort({ createdAt: -1 });

    return res.json(leaves || []);
  } catch (err) {
    console.error("GET MY LEAVES ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
