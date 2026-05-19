import mongoose from "mongoose";
import Leave from "../models/LeaveRequest.js";
import Entitlement from "../models/Entitlement.js";
import LeaveType from "../models/LeaveType.js";
import User from "../models/User.js";
import { differenceInMonths } from "date-fns";

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
// ✅ APPLY LEAVE – handles accrual correctly
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

    // --- Recalculate totalDays for accrual leave on the fly ---
    let currentTotalDays = entitlement.totalDays;
    if (entitlement.type === "accrual") {
      const today = new Date();
      const accrualStart = entitlement.startDate || entitlement.createdAt || today;
      const monthsWorked = differenceInMonths(today, accrualStart);
      const accrued = monthsWorked * (entitlement.accrualRate || 0);
      currentTotalDays = Math.min(accrued, entitlement.maxDays);
    } else {
      // Fixed: totalDays should be maxDays if somehow not set
      if (!currentTotalDays && entitlement.maxDays) {
        currentTotalDays = entitlement.maxDays;
      }
    }

    const remaining = currentTotalDays - entitlement.usedDays;
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

    return res.status(201).json({ message: "Leave applied successfully", leave });
  } catch (err) {
    console.error("APPLY LEAVE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================
// ✅ GET PENDING LEAVES (Manager only)
// ============================
export const getPendingLeaves = async (req, res) => {
  try {
    const managerId = getUserId(req);
    if (!managerId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const employees = await User.find({ manager: managerId, role: "employee" }).select("_id");
    const employeeIds = employees.map((e) => e._id);

    if (employeeIds.length === 0) {
      return res.status(200).json([]);
    }

    const leaves = await Leave.find({
      user: { $in: employeeIds },
      status: { $regex: /^pending$/i },
    })
      .populate("user", "firstName lastName email")
      .populate("leaveType", "name")
      .sort({ createdAt: -1 });

    return res.json(leaves);
  } catch (err) {
    console.error("PENDING LEAVES ERROR:", err);
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
    if (!leave) return res.status(404).json({ message: "Leave not found" });

    if (!leave.user?.manager) return res.status(403).json({ message: "Employee has no manager" });
    if (!isSameId(leave.user.manager, managerId)) return res.status(403).json({ message: "Not authorized" });

    const newStatus = action === "approve" ? "Approved" : "Rejected";

    if (newStatus === "Approved") {
      const entitlement = await Entitlement.findOne({ user: leave.user._id, leaveType: leave.leaveType });
      if (!entitlement) return res.status(400).json({ message: "Entitlement not found" });

      // Recalculate totalDays for accrual
      let currentTotal = entitlement.totalDays;
      if (entitlement.type === "accrual") {
        const today = new Date();
        const accrualStart = entitlement.startDate || entitlement.createdAt || today;
        const monthsWorked = differenceInMonths(today, accrualStart);
        const accrued = monthsWorked * (entitlement.accrualRate || 0);
        currentTotal = Math.min(accrued, entitlement.maxDays);
      } else {
        if (!currentTotal && entitlement.maxDays) {
          currentTotal = entitlement.maxDays;
        }
      }

      const remaining = currentTotal - entitlement.usedDays;
      if (leave.days > remaining) {
        return res.status(400).json({ message: `Not enough balance. Remaining: ${remaining}` });
      }

      entitlement.usedDays += leave.days;
      await entitlement.save();
    }

    const updated = await Leave.findByIdAndUpdate(
      id,
      { status: newStatus, approvedBy: managerId },
      { new: true }
    );
    return res.json({ message: `Leave ${newStatus.toLowerCase()} successfully`, leave: updated });
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
    const { organization } = req.query;
    const filter = {};
    if (organization) {
      if (!mongoose.Types.ObjectId.isValid(organization)) {
        return res.status(400).json({ message: "Invalid organization ID" });
      }
      filter.organization = organization;
    }
    const leaveTypes = await LeaveType.find(filter);
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
// 📌 GET USER LEAVE TYPES (Entitlements) – CORRECTED
// ============================
export const getUserLeaveTypes = async (req, res) => {
  try {
    const userId = getUserId(req);
    const data = await Entitlement.find({ user: userId }).populate("leaveType", "name");

    const today = new Date();

    const result = data.map((ent) => {
      const doc = ent.toObject();

      const entType   = doc.type;       // "fixed" | "accrual"
      const maxDays   = doc.maxDays  ?? 0;
      const usedDays  = doc.usedDays ?? 0;

      let totalDays;

      if (entType === "accrual") {
        /*
         * Accrual: compute days earned so far.
         * Formula: monthsWorked × accrualRate, capped at maxDays.
         * Result CAN be 0 – that is correct and must NOT be replaced by maxDays.
         */
        const accrualStart  = doc.startDate || doc.createdAt || today;
        const monthsWorked  = differenceInMonths(today, new Date(accrualStart));
        const accrued       = monthsWorked * (doc.accrualRate || 0);
        totalDays           = Math.min(accrued, maxDays);
      } else {
        /*
         * Fixed: admin sets an explicit entitlement.
         * Use totalDays from DB.  If it was never set (legacy data),
         * fall back to maxDays.  0 is treated as "not set" for fixed
         * entitlements because fixed leave is always pre-allocated.
         */
        totalDays = (doc.totalDays > 0)
          ? doc.totalDays
          : (maxDays > 0 ? maxDays : 0);
      }

      return {
        _id:         doc._id,
        leaveType:   doc.leaveType,
        type:        entType,          // ← returned so frontend knows accrual vs fixed
        totalDays,                     // ← the definitive computed value
        usedDays,
        maxDays,
        accrualRate: doc.accrualRate ?? 0,
        startDate:   doc.startDate,
      };
    });

    return res.json(result);
  } catch (err) {
    console.error("getUserLeaveTypes error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================
// 📌 GET USER LEAVE HISTORY (own)
// ============================
export const getUserLeaveHistory = async (req, res) => {
  try {
    const userId = getUserId(req);
    const leaves = await Leave.find({ user: userId })
      .populate("leaveType", "name")
      .populate("approvedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    const formatted = leaves.map((l) => ({
      id:         l._id,
      userId:     l.user?._id?.toString(),
      type:       l.leaveType?.name || "Unknown",
      start:      l.start,
      end:        l.end,
      days:       l.days,
      reason:     l.reason,
      status:     l.status,
      approvedBy: l.approvedBy ? `${l.approvedBy.firstName} ${l.approvedBy.lastName}` : "-",
      createdAt:  l.createdAt,
    }));

    return res.json(formatted);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================
// 📌 GET LEAVE HISTORY BY EMPLOYEE ID (Manager/Admin)
// ============================
export const getUserLeaveHistoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const leaves = await Leave.find({ user: id })
      .populate("leaveType", "name")
      .populate("approvedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    const formatted = leaves.map((l) => ({
      id:         l._id,
      userId:     l.user?._id?.toString(),
      type:       l.leaveType?.name || "Unknown",
      start:      l.start,
      end:        l.end,
      days:       l.days,
      reason:     l.reason,
      status:     l.status,
      approvedBy: l.approvedBy
        ? `${l.approvedBy.firstName} ${l.approvedBy.lastName}`
        : "-",
      createdAt: l.createdAt,
    }));

    return res.json(formatted);
  } catch (err) {
    console.error("GET USER LEAVE HISTORY BY ID ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================
// 📌 GET ALL LEAVES FOR MANAGER'S TEAM
// ============================
export const getManagerLeaves = async (req, res) => {
  try {
    const managerId = getUserId(req);
    if (!managerId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const employees = await User.find({ manager: managerId, role: "employee" }).select("_id");
    const employeeIds = employees.map((e) => e._id);

    if (employeeIds.length === 0) {
      return res.json([]);
    }

    const leaves = await Leave.find({ user: { $in: employeeIds } })
      .populate("user", "firstName lastName email")
      .populate("leaveType", "name")
      .populate("approvedBy", "firstName lastName email")
      .sort({ start: 1 });

    const formatted = leaves.map((l) => ({
      id:         l._id,
      userId:     l.user?._id?.toString(),
      employee:   l.user ? `${l.user.firstName} ${l.user.lastName}` : "Unknown",
      type:       l.leaveType?.name || "Unknown",
      start:      l.start,
      end:        l.end,
      days:       l.days,
      reason:     l.reason,
      status:     l.status,
      approvedBy: l.approvedBy
        ? `${l.approvedBy.firstName} ${l.approvedBy.lastName}`
        : "-",
      createdAt: l.createdAt,
    }));

    return res.json(formatted);
  } catch (err) {
    console.error("GET MANAGER LEAVES ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================
// 🛡️ GET ALL LEAVES (ADMIN ONLY) – full populated list with filters
// ============================
export const getAllLeavesForAdmin = async (req, res) => {
  try {
    const {
      startDate, endDate, organization, department,
      subDepartment, employee, leaveType, status,
    } = req.query;

    const filter = {};

    if (startDate) {
      const d = new Date(startDate);
      if (isNaN(d.getTime())) return res.status(400).json({ message: "Invalid startDate" });
      filter.start = { ...filter.start, $gte: d };
    }
    if (endDate) {
      const d = new Date(endDate);
      if (isNaN(d.getTime())) return res.status(400).json({ message: "Invalid endDate" });
      filter.end = { ...filter.end, $lte: d };
    }

    if (employee) {
      if (!mongoose.Types.ObjectId.isValid(employee))
        return res.status(400).json({ message: "Invalid employee ID" });
      filter.user = new mongoose.Types.ObjectId(employee);
    } else if (subDepartment) {
      if (!mongoose.Types.ObjectId.isValid(subDepartment))
        return res.status(400).json({ message: "Invalid subDepartment ID" });
      const users = await User.find({ subDepartment }).select("_id");
      const ids = users.map((u) => u._id);
      if (ids.length) filter.user = { $in: ids };
      else return res.json([]);
    } else if (department) {
      if (!mongoose.Types.ObjectId.isValid(department))
        return res.status(400).json({ message: "Invalid department ID" });
      const users = await User.find({ department }).select("_id");
      const ids = users.map((u) => u._id);
      if (ids.length) filter.user = { $in: ids };
      else return res.json([]);
    } else if (organization) {
      if (!mongoose.Types.ObjectId.isValid(organization))
        return res.status(400).json({ message: "Invalid organization ID" });
      const users = await User.find({ organization }).select("_id");
      const ids = users.map((u) => u._id);
      if (ids.length) filter.user = { $in: ids };
      else return res.json([]);
    }

    if (leaveType) {
      if (!mongoose.Types.ObjectId.isValid(leaveType))
        return res.status(400).json({ message: "Invalid leaveType ID" });
      filter.leaveType = new mongoose.Types.ObjectId(leaveType);
    }
    if (status) filter.status = status;

    const leaves = await Leave.find(filter)
      .populate("user", "firstName lastName email department subDepartment organization")
      .populate("leaveType", "name")
      .populate("approvedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    return res.json(leaves);
  } catch (error) {
    console.error("ADMIN LEAVES ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ============================
// 🚀 GET ALL LEAVES SUMMARY (ADMIN ONLY) – aggregation-optimised
// ============================
export const getAllLeavesSummary = async (req, res) => {
  try {
    const {
      startDate, endDate, organization, department,
      subDepartment, employee, leaveType, status,
    } = req.query;

    const match = {};

    if (startDate) {
      const d = new Date(startDate);
      if (isNaN(d.getTime())) return res.status(400).json({ message: "Invalid startDate" });
      match.start = { $gte: d };
    }
    if (endDate) {
      const d = new Date(endDate);
      if (isNaN(d.getTime())) return res.status(400).json({ message: "Invalid endDate" });
      match.end = { $lte: d };
    }

    if (leaveType) {
      if (!mongoose.Types.ObjectId.isValid(leaveType))
        return res.status(400).json({ message: "Invalid leaveType ID" });
      match.leaveType = new mongoose.Types.ObjectId(leaveType);
    }
    if (status) match.status = status;

    let userIds = null;
    if (employee) {
      if (!mongoose.Types.ObjectId.isValid(employee))
        return res.status(400).json({ message: "Invalid employee ID" });
      match.user = new mongoose.Types.ObjectId(employee);
    } else if (subDepartment) {
      if (!mongoose.Types.ObjectId.isValid(subDepartment))
        return res.status(400).json({ message: "Invalid subDepartment ID" });
      const users = await User.find({ subDepartment }).select("_id");
      userIds = users.map((u) => u._id);
    } else if (department) {
      if (!mongoose.Types.ObjectId.isValid(department))
        return res.status(400).json({ message: "Invalid department ID" });
      const users = await User.find({ department }).select("_id");
      userIds = users.map((u) => u._id);
    } else if (organization) {
      if (!mongoose.Types.ObjectId.isValid(organization))
        return res.status(400).json({ message: "Invalid organization ID" });
      const users = await User.find({ organization }).select("_id");
      userIds = users.map((u) => u._id);
    }

    if (userIds !== null) {
      if (userIds.length === 0) {
        return res.json({
          total: 0, approved: 0, pending: 0,
          rejected: 0, cancelled: 0, totalDays: 0,
          expiringCount: 0, chartData: [],
        });
      }
      match.user = { $in: userIds };
    }

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id:       null,
          total:     { $sum: 1 },
          totalDays: { $sum: "$days" },
          approved:  { $sum: { $cond: [{ $eq: ["$status", "Approved"]  }, 1, 0] } },
          pending:   { $sum: { $cond: [{ $eq: ["$status", "Pending"]   }, 1, 0] } },
          rejected:  { $sum: { $cond: [{ $eq: ["$status", "Rejected"]  }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] } },
        },
      },
    ];

    const result = await Leave.aggregate(pipeline);

    if (result.length === 0) {
      return res.json({
        total: 0, approved: 0, pending: 0,
        rejected: 0, cancelled: 0, totalDays: 0,
        expiringCount: 0, chartData: [],
      });
    }

    const agg    = result[0];
    const today  = new Date();
    const future = new Date();
    future.setDate(today.getDate() + 7);

    const expiringLeaves = await Leave.distinct("user", {
      ...match,
      status: { $in: ["Approved", "Pending"] },
      end:    { $gte: today, $lte: future },
    });

    const chartData = [
      { name: "Approved",  value: agg.approved  },
      { name: "Pending",   value: agg.pending   },
      { name: "Rejected",  value: agg.rejected  },
      { name: "Cancelled", value: agg.cancelled },
    ];

    return res.json({
      total:         agg.total,
      approved:      agg.approved,
      pending:       agg.pending,
      rejected:      agg.rejected,
      cancelled:     agg.cancelled,
      totalDays:     agg.totalDays,
      expiringCount: expiringLeaves.length,
      chartData,
    });
  } catch (error) {
    console.error("ADMIN LEAVES SUMMARY ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// In applyLeave (after creating the leave)
const leave = await Leave.create({...});  // existing code

// --- ADD NOTIFICATION ---
try {
  const manager = await User.findById(leave.user.manager);
  if (manager) {
    await notificationService.send({
      recipientId: manager._id,
      recipientEmail: manager.email,
      recipientPhone: manager.phone,
      senderId: userId,
      senderName: req.user.name || `${req.user.firstName} ${req.user.lastName}`,
      type: "leave_submitted",
      title: `Leave Request from ${req.user.firstName}`,
      message: `${req.user.firstName} ${req.user.lastName} has applied for ${leaveType.name} (${days} days).`,
      channels: ["in_app", "email"],  // notify manager
      metadata: {
        employeeName: req.user.firstName + " " + req.user.lastName,
        leaveType: leaveType.name,
        startDate: start,
        endDate: end,
        days,
        reason
      },
      io: req.app.get("io")
    });
  }
} catch (err) {
  console.error("Leave submitted notification error:", err.message);
}

// In updateLeaveStatus (when approving/rejecting)
if (newStatus === "Approved") {
  // ... existing balance deduction

  // --- ADD NOTIFICATION ---
  try {
    await notificationService.send({
      recipientId: leave.user._id,
      recipientEmail: leave.user.email,
      recipientPhone: leave.user.phone,
      senderId: managerId,
      senderName: req.user.name || `${req.user.firstName} ${req.user.lastName}`,
      type: "leave_approved",
      title: "Leave Approved",
      message: `Your ${leaveType.name} leave (${leave.days} days) has been approved.`,
      channels: ["in_app", "email"],
      metadata: {
        employeeName: leave.user.firstName + " " + leave.user.lastName,
        leaveType: leaveType.name,
        startDate: leave.start,
        endDate: leave.end,
        days: leave.days,
        approvedBy: req.user.name
      },
      io: req.app.get("io")
    });
  } catch (err) {
    console.error("Leave approval notification error:", err.message);
  }
}
