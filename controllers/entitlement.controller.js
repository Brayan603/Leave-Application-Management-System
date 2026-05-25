import mongoose from "mongoose";
import Entitlement from "../models/Entitlement.js";
import { differenceInMonths } from "date-fns";

/**
 * =====================================
 * CREATE / UPDATE ENTITLEMENTS
 * =====================================
 */
export const createEntitlement = async (req, res) => {
  try {
    const { userId, entitlements } = req.body;

    console.log("REQUEST BODY:", JSON.stringify(req.body, null, 2));

    // =========================
    // VALIDATION
    // =========================
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Valid userId is required",
      });
    }

    if (!Array.isArray(entitlements) || entitlements.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Entitlements array is required",
      });
    }

    const results = [];
    let createdCount = 0;
    let updatedCount = 0;

    // =========================
    // PROCESS EACH ENTITLEMENT
    // =========================
    for (const item of entitlements) {
      const leaveTypeId = item.leaveTypeId;
      const type = item.type;

      // 🔥 FORCE CLEAN NUMBERS (FIX YOUR BUG)
      const maxDays = Number(item.maxDays);
      const accrualRate = Number(item.accrualRate || 0);
      const startDate = item.startDate ? new Date(item.startDate) : new Date();

      // =========================
      // VALIDATION GUARDS
      // =========================
      if (!leaveTypeId || !mongoose.Types.ObjectId.isValid(leaveTypeId)) {
        console.log("SKIP INVALID leaveTypeId:", item);
        continue;
      }

      if (!["fixed", "accrual"].includes(type)) {
        console.log("SKIP INVALID type:", item);
        continue;
      }

      if (!maxDays || maxDays <= 0) {
        console.log("SKIP INVALID maxDays:", item);
        continue;
      }

      // =========================
      // CALCULATE TOTAL DAYS
      // =========================
      let totalDays;

      if (type === "fixed") {
        totalDays = maxDays;
      } else {
        const months = differenceInMonths(new Date(), startDate);
        const accrued = months * accrualRate;
        totalDays = Math.min(accrued, maxDays);
      }

      // =========================
      // FIND EXISTING
      // =========================
      let entitlement = await Entitlement.findOne({
        user: userId,
        leaveType: leaveTypeId,
      });

      // =========================
      // UPDATE
      // =========================
      if (entitlement) {
        entitlement.type = type;
        entitlement.maxDays = maxDays;
        entitlement.accrualRate = type === "accrual" ? accrualRate : 0;
        entitlement.startDate = startDate;
        entitlement.totalDays = totalDays;

        const updated = await entitlement.save();

        results.push(updated);
        updatedCount++;

        console.log("UPDATED:", {
          userId,
          leaveTypeId,
          maxDays,
          totalDays,
        });
      }

      // =========================
      // CREATE
      // =========================
      else {
        const created = await Entitlement.create({
          user: userId,
          leaveType: leaveTypeId,
          type,
          maxDays,
          accrualRate: type === "accrual" ? accrualRate : 0,
          totalDays,
          usedDays: 0,
          startDate,
        });

        results.push(created);
        createdCount++;

        console.log("CREATED:", {
          userId,
          leaveTypeId,
          maxDays,
          totalDays,
        });
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
    console.error("ENTITLEMENT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * =====================================
 * GET ALL ENTITLEMENTS
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
 * GET USER ENTITLEMENTS (CALCULATED VIEW)
 * =====================================
 */
export const getUserEntitlements = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    const entitlements = await Entitlement.find({
      user: userId,
    }).populate("leaveType", "name");

    const data = entitlements.map((e) => {
      let totalDays = e.totalDays;

      if (e.type === "accrual") {
        const months = differenceInMonths(new Date(), e.startDate);
        const accrued = months * e.accrualRate;
        totalDays = Math.min(accrued, e.maxDays);
      }

      return {
        ...e.toObject(),
        totalDays,
        availableDays: totalDays - e.usedDays,
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
 * UPDATE ENTITLEMENT (SAFE)
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
