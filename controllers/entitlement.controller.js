import Entitlement from "../models/Entitlement.js";
import { differenceInMonths } from "date-fns";

// ============================
// ✅ Create Entitlement (Admin)
// ============================
export const createEntitlement = async (req, res) => {
  try {
    const { userId, leaveTypeIds, type, maxDays, accrualRate, startDate } = req.body;

    if (!userId || !leaveTypeIds || leaveTypeIds.length === 0) {
      return res.status(400).json({ message: "User and leave type required" });
    }

    if (!["fixed", "accrual"].includes(type)) {
      return res.status(400).json({ message: "type must be 'fixed' or 'accrual'" });
    }

    if (type === "accrual" && (!accrualRate || Number(accrualRate) <= 0)) {
      return res.status(400).json({
        message: "accrualRate is required and must be > 0 for accrual entitlements",
      });
    }

    const created = [];

    for (const typeId of leaveTypeIds) {
      const exists = await Entitlement.findOne({ user: userId, leaveType: typeId });
      if (exists) continue;

      /*
       * totalDays stored in DB:
       * • fixed   → pre-allocated, starts at maxDays
       * • accrual → starts at 0; the API recomputes it on every read
       *             based on (monthsWorked × accrualRate), so DB value
       *             doesn't matter much — but 0 is the correct seed.
       */
      const initialTotalDays = type === "fixed" ? Number(maxDays) : 0;

      const entitlement = await Entitlement.create({
        user:        userId,
        leaveType:   typeId,
        type,
        maxDays:     Number(maxDays),
        accrualRate: type === "accrual" ? Number(accrualRate) : 0,
        totalDays:   initialTotalDays,
        usedDays:    0,
        startDate:   startDate ? new Date(startDate) : new Date(),
      });

      created.push(entitlement);
    }

    return res.status(201).json({
      message: "Entitlements assigned successfully",
      data: created,
    });
  } catch (err) {
    console.error("CREATE ENTITLEMENT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================
// ✅ Get all entitlements
// ============================
export const getAllEntitlements = async (req, res) => {
  try {
    const data = await Entitlement.find()
      .populate("user",      "firstName lastName email")
      .populate("leaveType", "name");
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ============================
// ✅ Get entitlements for a specific user (with live accrual)
// ============================
export const getUserEntitlements = async (req, res) => {
  try {
    const { userId } = req.params;
    const data = await Entitlement.find({ user: userId }).populate("leaveType", "name");

    const today = new Date();

    const result = data.map((ent) => {
      const doc = ent.toObject();

      let totalDays;

      if (doc.type === "accrual") {
        const accrualStart = doc.startDate || doc.createdAt || today;
        const monthsWorked = differenceInMonths(today, new Date(accrualStart));
        const accrued      = monthsWorked * (doc.accrualRate || 0);
        totalDays          = Math.min(accrued, doc.maxDays);
      } else {
        // Fixed: use stored totalDays; fall back to maxDays for legacy records
        totalDays = (doc.totalDays > 0) ? doc.totalDays : (doc.maxDays ?? 0);
      }

      return {
        ...doc,
        totalDays, // overwrite with computed value
      };
    });

    return res.json(result);
  } catch (err) {
    console.error("GET USER ENTITLEMENTS ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

// ============================
// ✅ Update entitlement
// ============================
export const updateEntitlement = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Entitlement.findByIdAndUpdate(id, req.body, { new: true });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ============================
// ✅ Delete entitlement
// ============================
export const deleteEntitlement = async (req, res) => {
  try {
    const { id } = req.params;
    await Entitlement.findByIdAndDelete(id);
    return res.json({ message: "Entitlement deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

