import LeaveType from "../models/Leaves.js";

// ============================
// GET ALL LEAVE TYPES
// ============================
export const getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find();

    res.status(200).json(leaveTypes);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error fetching leave types",
    });
  }
};

// ============================
// CREATE LEAVE TYPE
// ============================
export const createLeaveType = async (req, res) => {
  try {
    let {
      name,
      type,
      maxDays,
      accrualRate,
    } = req.body;

    // ============================
    // VALIDATION
    // ============================
    if (!name || !type) {
      return res.status(400).json({
        message: "Name and type are required",
      });
    }

    // fixed leave
    if (type === "fixed") {
      accrualRate = 0;
    }

    // accrual leave
    if (type === "accrual") {
      if (!accrualRate || accrualRate <= 0) {
        return res.status(400).json({
          message: "Accrual rate is required",
        });
      }
    }

    const leaveType = await LeaveType.create({
      name,
      type,
      maxDays,
      accrualRate,
    });

    res.status(201).json(leaveType);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error creating leave type",
    });
  }
};

// ============================
// DELETE LEAVE TYPE
// ============================
export const deleteLeaveType = async (req, res) => {
  try {
    await LeaveType.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error deleting leave type",
    });
  }
};
