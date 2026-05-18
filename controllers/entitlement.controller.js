import Entitlement from "../models/Entitlement.js";
import { differenceInMonths } from "date-fns";

// ============================
// ✅ Create Entitlement (Admin)
// ============================
export const createEntitlement = async (
  req,
  res
) => {
  try {
    const {
      userId,
      leaveTypeIds,
      type,
      maxDays,
      accrualRate,
      startDate,
    } = req.body;

    if (
      !userId ||
      !leaveTypeIds ||
      leaveTypeIds.length === 0
    ) {
      return res.status(400).json({
        message:
          "User and leave type required",
      });
    }

    const created = [];

    for (const typeId of leaveTypeIds) {
      const exists =
        await Entitlement.findOne({
          user: userId,
          leaveType: typeId,
        });

      if (exists) continue;

      // fixed leave starts with max
      // accrual starts at 0
      const initialBalance =
        type === "fixed"
          ? Number(maxDays)
          : 0;

      const entitlement =
        await Entitlement.create({
          user: userId,
          leaveType: typeId,

          type,
          maxDays,

          accrualRate:
            type === "accrual"
              ? accrualRate
              : 0,

          totalDays: initialBalance,

          usedDays: 0,

          startDate:
            startDate || new Date(),
        });

      created.push(entitlement);
    }

    return res.status(201).json({
      message:
        "Entitlements assigned successfully",
      data: created,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
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
export const getUserEntitlements =
  async (req, res) => {
    try {
      const { userId } = req.params;

      let data =
        await Entitlement.find({
          user: userId,
        }).populate(
          "leaveType",
          "name"
        );

      data = data.map((e) => {
        // accrual leave
        if (e.type === "accrual") {
          const today = new Date();

          const monthsWorked =
            differenceInMonths(
              today,
              e.startDate || today
            );

          const accrued =
            monthsWorked *
            e.accrualRate;

          // limit to max days
          e.totalDays = Math.min(
            accrued,
            e.maxDays
          );
        }

        return e;
      });

      res.json(data);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: err.message,
      });
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

