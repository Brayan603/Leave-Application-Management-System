import Entitlement from "../models/Entitlement.js";
import { differenceInMonths } from "date-fns";

// ============================
// ✅ Create Entitlement (Admin)
// ============================
export const createEntitlement = async (req, res) => {
  try {
    const {
      userId,
      entitlements,
    } = req.body;

    if (
      !userId ||
      !entitlements ||
      !Array.isArray(entitlements) ||
      entitlements.length === 0
    ) {
      return res.status(400).json({
        message:
          "User and entitlements required",
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

      const exists =
        await Entitlement.findOne({
          user: userId,
          leaveType,
        });

      if (exists) {
        continue;
      }

      let totalDays = 0;

      // FIXED LEAVE
      if (type === "fixed") {
        totalDays = Number(maxDays || 0);
      }

      // ACCRUAL LEAVE
      if (type === "accrual") {
        totalDays = 0;
      }

      const entitlement =
        await Entitlement.create({
          user: userId,

          leaveType,

          type,

          maxDays: Number(
            maxDays || 0
          ),

          totalDays,

          usedDays: 0,

          accrualRate:
            type === "accrual"
              ? Number(
                  accrualRate || 0
                )
              : 0,

          startDate:
            startDate ||
            new Date(),
        });

      created.push(entitlement);
    }

    return res.status(201).json({
      message:
        "Entitlements assigned successfully",

      data: created,
    });
  } catch (err) {
    console.error(
      "CREATE ENTITLEMENT ERROR:",
      err
    );

    return res.status(500).json({
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

