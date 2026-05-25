import mongoose from "mongoose";
import Entitlement from "../models/Entitlement.js";
import { differenceInMonths } from "date-fns";

/**
 * =====================================
 * CREATE OR UPDATE ENTITLEMENTS
 * =====================================
 */
export const createEntitlement = async (req, res) => {
  try {
    const { userId, entitlements } = req.body;

    // =====================
    // VALIDATION
    // =====================
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

    if (!Array.isArray(entitlements) || entitlements.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Entitlements are required",
      });
    }

    const results = [];
    let createdCount = 0;
    let updatedCount = 0;

    // =====================
    // PROCESS EACH ITEM
    // =====================
    for (const item of entitlements) {
      const {
        leaveTypeId,
        type,
        maxDays,
        accrualRate,
        startDate,
      } = item;

      if (!leaveTypeId || !mongoose.Types.ObjectId.isValid(leaveTypeId)) continue;
      if (!["fixed", "accrual"].includes(type)) continue;

      const max = Number(maxDays);
      if (isNaN(max) || max < 0) continue;

      const rate = Number(accrualRate || 0);
      const start = startDate ? new Date(startDate) : new Date();

      // =====================
      // CALCULATE TOTAL DAYS
      // =====================
      let totalDays = 0;

      if (type === "fixed") {
        totalDays = max;
      } else {
        const months = differenceInMonths(new Date(), start);
        const accrued = months * rate;
        totalDays = Math.min(accrued, max);
      }

      // =====================
      // CHECK EXISTING
      // =====================
      let entitlement = await Entitlement.findOne({
        user: userId,
        leaveType: leaveTypeId,
      });

      // =====================
      // UPDATE
      // =====================
      if (entitlement) {
        entitlement.type = type;
        entitlement.maxDays = max;
        entitlement.accrualRate = type === "accrual" ? rate : 0;
        entitlement.startDate = start;

        entitlement.totalDays = totalDays;

        const updated = await entitlement.save();

        results.push(updated);
        updatedCount++;

        console.log("UPDATED:", userId, leaveTypeId);
      }

      // =====================
      // CREATE
      // =====================
      else {
        const created = await Entitlement.create({
          user: userId,
          leaveType: leaveTypeId,
          type,
          maxDays: max,
          accrualRate: type === "accrual" ? rate : 0,
          totalDays,
          usedDays: 0,
          startDate: start,
        });

        results.push(created);
        createdCount++;

        console.log("CREATED:", userId, leaveTypeId);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Entitlements processed successfully",
      createdCount,
      updatedCount,
      totalCount: results.length,
      data: results,
    });
  } catch (err) {
    console.error("CREATE ENTITLEMENT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * =====================================
 * GET ALL ENTITLEMENTS (DB TRUTH ONLY)
 * =====================================
 */
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

/**
 * =====================================
 * GET USER ENTITLEMENTS (CALCULATED VIEW ONLY)
 * =====================================
 */
export const getUserEntitlements = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const entitlements = await Entitlement.find({ user: userId })
      .populate("leaveType", "name");

    const data = entitlements.map((e) => {
      let total = e.totalDays;

      if (e.type === "accrual") {
        const months = differenceInMonths(new Date(), e.startDate);
        total = Math.min(months * e.accrualRate, e.maxDays);
      }

      return {
        ...e.toObject(),
        totalDays: total,
        availableDays: total - e.usedDays,
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

/**
 * =====================================
 * UPDATE ENTITLEMENT (DIRECT PATCH)
 * =====================================
 */
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

/**
 * =====================================
 * DELETE ENTITLEMENT
 * =====================================
 */
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

