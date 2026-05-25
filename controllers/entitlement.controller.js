// controllers/entitlementController.js

import mongoose from "mongoose";
import Entitlement from "../models/Entitlement.js";
import { differenceInMonths } from "date-fns";

/**
 * =====================================
 * CREATE ENTITLEMENTS
 * PREVENT DUPLICATE LEAVE TYPES
 * =====================================
 */
export const createEntitlement = async (req, res) => {
  try {
    const { userId, entitlements } = req.body;

    console.log(
      "REQUEST BODY:",
      JSON.stringify(req.body, null, 2)
    );

    // =========================
    // VALIDATION
    // =========================
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Valid userId is required",
      });
    }

    if (
      !Array.isArray(entitlements) ||
      entitlements.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Entitlements array is required",
      });
    }

    const created = [];
    const duplicates = [];
    const skipped = [];

    // =========================
    // PROCESS ENTITLEMENTS
    // =========================
    for (const item of entitlements) {
      try {
        const leaveTypeId = item.leaveTypeId;
        const type = item.type || "fixed";

        // SAFE NUMBERS
        const maxDays = Number(item.maxDays);
        const accrualRate = Number(
          item.accrualRate || 0
        );

        const startDate = item.startDate
          ? new Date(item.startDate)
          : new Date();

        // =========================
        // VALIDATE LEAVE TYPE ID
        // =========================
        if (
          !leaveTypeId ||
          !mongoose.Types.ObjectId.isValid(
            leaveTypeId
          )
        ) {
          skipped.push({
            item,
            reason: "Invalid leaveTypeId",
          });

          continue;
        }

        // =========================
        // VALIDATE TYPE
        // =========================
        if (
          !["fixed", "accrual"].includes(type)
        ) {
          skipped.push({
            item,
            reason: "Invalid entitlement type",
          });

          continue;
        }

        // =========================
        // VALIDATE MAX DAYS
        // =========================
        if (!maxDays || maxDays <= 0) {
          skipped.push({
            item,
            reason: "Invalid maxDays",
          });

          continue;
        }

        // =========================
        // CHECK DUPLICATE
        // =========================
        const existing = await Entitlement.findOne({
          user: userId,
          leaveType: leaveTypeId,
        });

        // IF EXISTS => SKIP
        if (existing) {
          duplicates.push({
            leaveTypeId,
            message:
              "User already has this entitlement",
          });

          continue;
        }

        // =========================
        // CALCULATE TOTAL DAYS
        // =========================
        let totalDays = maxDays;

        if (type === "accrual") {
          const months = differenceInMonths(
            new Date(),
            startDate
          );

          const accrued =
            months * accrualRate;

          totalDays = Math.min(
            accrued,
            maxDays
          );
        }

        // =========================
        // CREATE ENTITLEMENT
        // =========================
        const entitlement =
          await Entitlement.create({
            user: userId,
            leaveType: leaveTypeId,

            type,

            maxDays,

            accrualRate:
              type === "accrual"
                ? accrualRate
                : 0,

            totalDays,

            usedDays: 0,

            startDate,
          });

        created.push(entitlement);

        console.log("CREATED:", {
          userId,
          leaveTypeId,
          maxDays,
          totalDays,
        });
      } catch (innerErr) {
        console.error(
          "ITEM ERROR:",
          innerErr
        );

        skipped.push({
          item,
          reason: innerErr.message,
        });
      }
    }

    // =========================
    // RESPONSE
    // =========================
    return res.status(201).json({
      success: true,

      message:
        "Entitlements processed successfully",

      createdCount: created.length,

      duplicateCount:
        duplicates.length,

      skippedCount: skipped.length,

      duplicates,

      skipped,

      data: created,
    });
  } catch (err) {
    console.error(
      "ENTITLEMENT ERROR:",
      err
    );

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
 * GET USER ENTITLEMENTS
 * =====================================
 */
export const getUserEntitlements =
  async (req, res) => {
    try {
      const { userId } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          userId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid userId",
        });
      }

      const entitlements =
        await Entitlement.find({
          user: userId,
        }).populate(
          "leaveType",
          "name"
        );

      const data = entitlements.map(
        (e) => {
          let totalDays =
            e.totalDays;

          // RECALCULATE ACCRUAL
          if (e.type === "accrual") {
            const months =
              differenceInMonths(
                new Date(),
                e.startDate
              );

            const accrued =
              months *
              e.accrualRate;

            totalDays = Math.min(
              accrued,
              e.maxDays
            );
          }

          return {
            ...e.toObject(),

            totalDays,

            availableDays:
              totalDays -
              e.usedDays,
          };
        }
      );

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
 * UPDATE ENTITLEMENT
 * =====================================
 */
export const updateEntitlement =
  async (req, res) => {
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
          message:
            "Entitlement not found",
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
export const deleteEntitlement =
  async (req, res) => {
    try {
      const deleted =
        await Entitlement.findByIdAndDelete(
          req.params.id
        );

      if (!deleted) {
        return res.status(404).json({
          success: false,
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
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };
