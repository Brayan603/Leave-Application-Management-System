import mongoose from "mongoose";
import Entitlement from "../models/Entitlement.js";
import { differenceInMonths } from "date-fns";


// =====================================
// ✅ CREATE ENTITLEMENT
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
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    if (
      !leaveTypeIds ||
      !Array.isArray(leaveTypeIds) ||
      leaveTypeIds.length === 0
    ) {
      return res.status(400).json({
        message: "Leave types are required",
      });
    }

    if (!["fixed", "accrual"].includes(type)) {
      return res.status(400).json({
        message: "Invalid entitlement type",
      });
    }

    if (Number(maxDays) < 0) {
      return res.status(400).json({
        message: "maxDays cannot be negative",
      });
    }

    const created = [];

    for (const leaveTypeId of leaveTypeIds) {
      // =================================
      // CHECK EXISTING ENTITLEMENT
      // =================================
      const exists = await Entitlement.findOne({
        user: userId,
        leaveType: leaveTypeId,
      }).session(session);

      if (exists) {
        continue;
      }

      // =================================
      // INITIAL BALANCE
      // =================================
      const initialBalance =
        type === "fixed"
          ? Number(maxDays)
          : 0;

      // =================================
      // CREATE
      // =================================
      const entitlement = new Entitlement({
        user: userId,
        leaveType: leaveTypeId,

        type,

        maxDays: Number(maxDays),

        accrualRate:
          type === "accrual"
            ? Number(accrualRate || 0)
            : 0,

        totalDays: initialBalance,

        usedDays: 0,

        startDate:
          startDate || new Date(),
      });

      // =================================
      // FORCE SAVE
      // =================================
      const saved = await entitlement.save({
        session,
      });

      // =================================
      // VERIFY SAVE
      // =================================
      const verify =
        await Entitlement.findById(
          saved._id
        ).session(session);

      if (!verify) {
        throw new Error(
          "Entitlement failed to persist"
        );
      }

      created.push(saved);
    }

    // =================================
    // COMMIT
    // =================================
    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message:
        "Entitlements assigned successfully",
      count: created.length,
      data: created,
    });
  } catch (err) {
    await session.abortTransaction();

    console.error(
      "CREATE ENTITLEMENT ERROR:",
      err
    );

    // Duplicate index protection
    if (err.code === 11000) {
      return res.status(409).json({
        message:
          "Entitlement already exists",
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  } finally {
    session.endSession();
  }
};


// =====================================
// ✅ GET ALL ENTITLEMENTS
// =====================================
export const getAllEntitlements =
  async (req, res) => {
    try {
      const data =
        await Entitlement.find()
          .populate(
            "user",
            "firstName lastName email"
          )
          .populate(
            "leaveType",
            "name"
          )
          .sort({
            createdAt: -1,
          });

      return res.status(200).json({
        success: true,
        count: data.length,
        data,
      });
    } catch (err) {
      console.error(err);

      return res.status(500).json({
        message: err.message,
      });
    }
  };


// =====================================
// ✅ GET USER ENTITLEMENTS
// =====================================
export const getUserEntitlements =
  async (req, res) => {
    try {
      const { userId } = req.params;

      const entitlements =
        await Entitlement.find({
          user: userId,
        }).populate(
          "leaveType",
          "name"
        );

      // ================================
      // SAFE CALCULATED RESPONSE
      // ================================
      const data = entitlements.map(
        (e) => {
          let calculatedTotal =
            e.totalDays;

          // accrual calculation
          if (e.type === "accrual") {
            const today = new Date();

            const monthsWorked =
              Math.max(
                0,
                differenceInMonths(
                  today,
                  e.startDate
                )
              );

            const accrued =
              monthsWorked *
              e.accrualRate;

            calculatedTotal =
              Math.min(
                accrued,
                e.maxDays
              );
          }

          return {
            ...e.toObject(),

            totalDays:
              calculatedTotal,

            availableDays:
              calculatedTotal -
              e.usedDays,
          };
        }
      );

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      console.error(err);

      return res.status(500).json({
        message: err.message,
      });
    }
  };


// =====================================
// ✅ UPDATE ENTITLEMENT
// =====================================
export const updateEntitlement =
  async (req, res) => {
    try {
      const { id } = req.params;

      const updated =
        await Entitlement.findByIdAndUpdate(
          id,
          req.body,
          {
            new: true,
            runValidators: true,
          }
        );

      if (!updated) {
        return res.status(404).json({
          message:
            "Entitlement not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      console.error(err);

      return res.status(500).json({
        message: err.message,
      });
    }
  };


// =====================================
// ✅ DELETE ENTITLEMENT
// =====================================
export const deleteEntitlement =
  async (req, res) => {
    try {
      const { id } = req.params;

      const deleted =
        await Entitlement.findByIdAndDelete(
          id
        );

      if (!deleted) {
        return res.status(404).json({
          message:
            "Entitlement not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Entitlement deleted successfully",
      });
    } catch (err) {
      console.error(err);

      return res.status(500).json({
        message: err.message,
      });
    }
  };

