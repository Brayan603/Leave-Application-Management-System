import Entitlement from "../models/Entitlement.js";
import { differenceInMonths } from "date-fns";

// ============================
// ✅ Create Entitlement (Admin)
// ============================
export const createEntitlement = async (req, res) => {
  try {
    const { userId, entitlements } = req.body;

    if (!userId || !entitlements || !entitlements.length) {
      return res.status(400).json({
        message: "User and entitlements required",
      });
    }

    const created = [];

    for (const item of entitlements) {
      const {
        leaveType,
        type,
        maxDays,
        accrualRate,
        startDate,
      } = item;

      const exists = await Entitlement.findOne({
        user: userId,
        leaveType,
      });

      if (exists) continue;

      // Fixed leave starts with full balance
      // Accrual starts with 0
      const initialBalance =
        type === "fixed"
          ? Number(maxDays)
          : 0;

      const entitlement = await Entitlement.create({
        user: userId,
        leaveType,

        type,

        maxDays: Number(maxDays),

        accrualRate:
          type === "accrual"
            ? Number(accrualRate || 0)
            : 0,

        totalDays: initialBalance,

        usedDays: 0,

        startDate: startDate || new Date(),
      });

      created.push(entitlement);
    }

    return res.status(201).json({
      message: "Entitlements assigned successfully",
      data: created,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

