import mongoose from "mongoose";
import Entitlement from "../models/Entitlement.js";
import { differenceInMonths } from "date-fns";


// =====================================
// ✅ CREATE ENTITLEMENT (FINAL FIX)
// =====================================
export const createEntitlement = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      userId,
      leaveTypeIds,
      type,
      maxDays,
      accrualRate,
      startDate,
    } = req.body;

    // ==========================
    // VALIDATION
    // ==========================
    if (!userId) {
      throw new Error("User ID is required");
    }

    if (
      !leaveTypeIds ||
      !Array.isArray(leaveTypeIds) ||
      leaveTypeIds.length === 0
    ) {
      throw new Error("Leave types are required");
    }

    if (!["fixed", "accrual"].includes(type)) {
      throw new Error("Invalid entitlement type");
    }

    if (Number(maxDays) < 0) {
      throw new Error("maxDays cannot be negative");
    }

    const created = [];

    const userObjectId = new mongoose.Types.ObjectId(userId);

    for (const leaveTypeId of leaveTypeIds) {
      const leaveTypeObjectId = new mongoose.Types.ObjectId(leaveTypeId);

      // =====================================
      // 🔥 FIXED DUPLICATE CHECK (ROBUST)
      // handles both ObjectId + string in DB
      // =====================================
      const exists = await Entitlement.findOne({
        $or: [
          {
            user: userObjectId,
            leaveType: leaveTypeObjectId,
          },
          {
            user: userId,
            leaveType: leaveTypeId,
          },
        ],
      }).session(session);

      if (exists) {
        console.log("SKIPPING EXISTING:", {
          userId,
          leaveTypeId,
        });
        continue;
      }

      // =====================================
      // INITIAL BALANCE
      // =====================================
      const initialBalance =
        type === "fixed" ? Number(maxDays) : 0;

      // =====================================
      // CREATE ENTITLEMENT
      // =====================================
      const entitlement = new Entitlement({
        user: userObjectId,
        leaveType: leaveTypeObjectId,
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

      const saved = await entitlement.save({ session });

      created.push(saved);
    }

    // =====================================
    // COMMIT TRANSACTION
    // =====================================
    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "Entitlements assigned successfully",
      count: created.length,
      data: created,
    });

  } catch (err) {
    await session.abortTransaction();

    console.error("CREATE ENTITLEMENT ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    session.endSession();
  }
};


// =====================================
// GET ALL ENTITLEMENTS
// =====================================
export const getAllEntitlements = async (req, res) => {
  try {
    const data = await Entitlement.find()
      .populate("user", "firstName lastName email")
      .populate("leaveType", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// =====================================
// GET USER ENTITLEMENTS
// =====================================
export const getUserEntitlements = async (req, res) => {
  try {
    const { userId } = req.params;

    const entitlements = await Entitlement.find({
      user: new mongoose.Types.ObjectId(userId),
    }).populate("leaveType", "name");

    const data = entitlements.map((e) => {
      let calculatedTotal = e.totalDays;

      if (e.type === "accrual") {
        const monthsWorked = Math.max(
          0,
          differenceInMonths(new Date(), e.startDate)
        );

        const accrued = monthsWorked * e.accrualRate;

        calculatedTotal = Math.min(accrued, e.maxDays);
      }

      return {
        ...e.toObject(),
        totalDays: calculatedTotal,
        availableDays: calculatedTotal - e.usedDays,
      };
    });

    return res.status(200).json({
      success: true,
      data,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// =====================================
// UPDATE ENTITLEMENT
// =====================================
export const updateEntitlement = async (req, res) => {
  try {
    const updated = await Entitlement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Entitlement not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: updated,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// =====================================
// DELETE ENTITLEMENT
// =====================================
export const deleteEntitlement = async (req, res) => {
  try {
    const deleted = await Entitlement.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Entitlement not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Entitlement deleted successfully",
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

