// controllers/entitlementController.js

import mongoose from "mongoose";
import Entitlement from "../models/Entitlement.js";
import { differenceInMonths } from "date-fns";

// =====================================
// CREATE OR UPDATE ENTITLEMENTS
// =====================================
export const createEntitlement = async (req, res) => {
  try {
    const {
      userId,
      entitlements,
    } = req.body;

    // =====================================
    // VALIDATION
    // =====================================
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (
      !entitlements ||
      !Array.isArray(entitlements) ||
      entitlements.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Entitlements are required",
      });
    }

    const results = [];
    let createdCount = 0;
    let updatedCount = 0;

    // =====================================
    // PROCESS EACH ENTITLEMENT
    // =====================================
    for (const item of entitlements) {

      const {
        leaveTypeId,
        type,
        maxDays,
        accrualRate,
        startDate,
      } = item;

      // =====================================
      // VALIDATE LEAVE TYPE
      // =====================================
      if (!leaveTypeId) {
        continue;
      }

      if (!mongoose.Types.ObjectId.isValid(leaveTypeId)) {
        continue;
      }

      if (!["fixed", "accrual"].includes(type)) {
        continue;
      }

      if (Number(maxDays) < 0) {
        continue;
      }

      // =====================================
      // CHECK EXISTING ENTITLEMENT
      // =====================================
      let entitlement = await Entitlement.findOne({
        user: userId,
        leaveType: leaveTypeId,
      });

      const initialBalance =
        type === "fixed"
          ? Number(maxDays)
          : 0;

      // =====================================
      // UPDATE EXISTING
      // =====================================
      if (entitlement) {

        entitlement.type = type;
        entitlement.maxDays = Number(maxDays);

        entitlement.accrualRate =
          type === "accrual"
            ? Number(accrualRate || 0)
            : 0;

        entitlement.totalDays =
          type === "fixed"
            ? Number(maxDays)
            : entitlement.totalDays;

        entitlement.startDate =
          startDate || entitlement.startDate;

        const updated = await entitlement.save();

        results.push(updated);

        updatedCount++;

        console.log("UPDATED:", {
          userId,
          leaveTypeId,
        });

      } else {

        // =====================================
        // CREATE NEW
        // =====================================
        const created = await Entitlement.create({
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

        results.push(created);

        createdCount++;

        console.log("CREATED:", {
          userId,
          leaveTypeId,
        });
      }
    }

    // =====================================
    // RESPONSE
    // =====================================
    return res.status(201).json({
      success: true,
      message: "Entitlements processed successfully",
      createdCount,
      updatedCount,
      totalCount: results.length,
      data: results,
    });

  } catch (err) {

    console.error(
      "CREATE ENTITLEMENT ERROR:",
      err.stack
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET ALL ENTITLEMENTS
// =====================================
export const getAllEntitlements = async (req, res) => {
  try {

    const data = await Entitlement.find()
      .populate(
        "user",
        "firstName lastName email"
      )
      .populate(
        "leaveType",
        "name"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });

  } catch (err) {

    console.error(err);

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

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const entitlements = await Entitlement.find({
      user: userId,
    }).populate("leaveType", "name");

    const data = entitlements.map((e) => {

      let calculatedTotal = e.totalDays;

      if (e.type === "accrual") {

        const monthsWorked = Math.max(
          0,
          differenceInMonths(
            new Date(),
            e.startDate
          )
        );

        const accrued =
          monthsWorked * e.accrualRate;

        calculatedTotal = Math.min(
          accrued,
          e.maxDays
        );
      }

      return {
        ...e.toObject(),

        totalDays: calculatedTotal,

        availableDays:
          calculatedTotal - e.usedDays,
      };
    });

    return res.status(200).json({
      success: true,
      data,
    });

  } catch (err) {

    console.error(err);

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

    const updated =
      await Entitlement.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true,
        }
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

    console.error(err);

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

    const deleted =
      await Entitlement.findByIdAndDelete(
        req.params.id
      );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Entitlement not found",
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
      success: false,
      message: err.message,
    });
  }
};

