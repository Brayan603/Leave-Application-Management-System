import LeaveBalance from "../models/LeaveBalance.js";

export const assignLeaveToUser = async (req, res) => {
  try {
    const { userId, leaveTypeId, balance, organizationId } = req.body;

    if (!userId || !leaveTypeId || !balance) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Save in DB
    const leaveBalance = await LeaveBalance.create({
      user: userId,
      leaveType: leaveTypeId,
      balance,
      organization: organizationId,
    });

    res.status(201).json(leaveBalance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
