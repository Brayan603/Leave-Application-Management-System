import LeaveType from "../models/LeaveType.js";
import LeaveBalance from "../models/LeaveBalance.js";
import User from "../models/User.js";

// Helper: Calculate accrued leave
const calculateAccruedLeave = (user, leaveType) => {
  let accrued = 0;

  if (leaveType.type === "accrual") {
    const rate = Number(leaveType.accrualRate);
    if (!rate || isNaN(rate)) throw new Error("Invalid accrualRate in LeaveType");

    const joinDate = new Date(user.createdAt);
    if (isNaN(joinDate)) throw new Error("Invalid user join date");

    const today = new Date();
    const monthsWorked = (today.getFullYear() - joinDate.getFullYear()) * 12 +
                         (today.getMonth() - joinDate.getMonth());

    accrued = monthsWorked * rate;
  } else if (leaveType.type === "fixed") {
    const max = Number(leaveType.maxDays);
    if (!max || isNaN(max)) throw new Error("Invalid maxDays in LeaveType");
    accrued = max;
  }

  return accrued;
};

// Apply Leave
export const applyLeave = async (req, res) => {
  try {
    const { userId, leaveTypeId, days } = req.body;
    if (!userId || !leaveTypeId || !days) return res.status(400).json({ message: "userId, leaveTypeId and days are required" });
    if (Number(days) <= 0) return res.status(400).json({ message: "Days must be greater than 0" });

    const user = await User.findById(userId);
    const leaveType = await LeaveType.findById(leaveTypeId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!leaveType) return res.status(404).json({ message: "Leave type not found" });

    let balanceDoc = await LeaveBalance.findOne({ userId, leaveTypeId });
    if (!balanceDoc) balanceDoc = new LeaveBalance({ userId, leaveTypeId, used: 0, accrued: 0, balance: 0 });

    const accrued = calculateAccruedLeave(user, leaveType);
    const used = balanceDoc.used || 0;
    const available = accrued - used;
    if (days > available) return res.status(400).json({ message: "Insufficient leave balance", available });

    balanceDoc.used += Number(days);
    balanceDoc.accrued = accrued;
    balanceDoc.balance = accrued - balanceDoc.used;
    await balanceDoc.save();

    res.status(200).json({
      message: "Leave applied successfully",
      data: {
        leaveType: leaveType.name,
        type: leaveType.type,
        daysRequested: Number(days),
        accrued: balanceDoc.accrued,
        used: balanceDoc.used,
        remaining: balanceDoc.balance,
      },
    });
  } catch (error) {
    console.error("Apply Leave Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ===============================
   🚀 GET ALL LEAVE TYPES
================================ */
export const getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find(); // fetch all leave types
    res.status(200).json({
      message: "Leave types fetched successfully",
      data: leaveTypes,
    });
  } catch (error) {
    console.error("Get Leave Types Error:", error);
    res.status(500).json({
      message: "Server error fetching leave types",
    });
  }
};
