import Entitlement from "../models/Entitlement.js";
import { differenceInMonths } from "date-fns";

// ============================
// ✅ Create Entitlement (Admin)
// ============================
export const createEntitlement = async (req, res) => {
  try {
    const { userId, leaveTypeId, leaveTypeIds, totalDays, startDate } = req.body;

    // 🔥 Allow BOTH single or multiple
    const types = leaveTypeIds?.length
      ? leaveTypeIds
      : leaveTypeId
      ? [leaveTypeId]
      : [];

    if (!userId || types.length === 0) {
      return res.status(400).json({
        message: "userId and at least one leave type are required",
      });
    }

    const created = [];

    for (const typeId of types) {
      // Prevent duplicate entitlement
      const exists = await Entitlement.findOne({
        user: userId,
        leaveType: typeId,
      });

      if (!exists) {
        const entitlement = await Entitlement.create({
          user: userId,
          leaveType: typeId,
          totalDays: totalDays || 0, // start at 0 for accrual types
          usedDays: 0,
          startDate: startDate || new Date(), // default to now
        });

        created.push(entitlement);
      }
    }

    return res.status(201).json({
      message: "Entitlements created successfully",
      data: created,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ============================
// ✅ Get all entitlements
// ============================
export const getAllEntitlements = async (req, res) => {
  try {
    const data = await Entitlement.find()
      .populate("user", "firstName lastName email")
      .populate("leaveType", "name");

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================
// ✅ Get user entitlements (with accrual)
// ============================
export const getUserEntitlements = async (req, res) => {
  try {
    const { userId } = req.params;

    let data = await Entitlement.find({ user: userId })
      .populate("leaveType", "name");

    // Apply accrual logic for Annual Leave
    data = data.map((e) => {
      if (e.leaveType?.name === "Annual Leave") {
        const today = new Date();
        const monthsWorked = differenceInMonths(today, e.startDate || today);

        const accrualRate = 1.67; // days per month
        const maxDays = 20;       // annual cap

        const accrued = Math.min(monthsWorked * accrualRate, maxDays);

        // dynamically override totalDays
        e.totalDays = accrued;
      }
      return e;
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================
// ✅ Update entitlement
// ============================
export const updateEntitlement = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Entitlement.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================
// ✅ Delete entitlement
// ============================
export const deleteEntitlement = async (req, res) => {
  try {
    const { id } = req.params;

    await Entitlement.findByIdAndDelete(id);

    res.json({ message: "Entitlement deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

