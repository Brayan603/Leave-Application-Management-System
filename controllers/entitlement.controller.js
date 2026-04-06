import Entitlement from "../models/Entitlement.js";

// ✅ Create Entitlement (Admin) - SUPPORTS MULTIPLE OR SINGLE
export const createEntitlement = async (req, res) => {
  try {
    const { userId, leaveTypeId, leaveTypeIds, totalDays } = req.body;

    // 🔥 Allow BOTH single or multiple
    const types = leaveTypeIds?.length
      ? leaveTypeIds
      : leaveTypeId
      ? [leaveTypeId]
      : [];

    if (!userId || types.length === 0) {
      return res.status(400).json({
        message: "userId and at least one leave type are required",
      });
    }

    const created = [];

    for (const typeId of types) {
      // Prevent duplicate entitlement
      const exists = await Entitlement.findOne({
        user: userId,
        leaveType: typeId,
      });

      if (!exists) {
        const entitlement = await Entitlement.create({
          user: userId,
          leaveType: typeId,
          totalDays: totalDays || 20, // default if not provided
          usedDays: 0,
        });

        created.push(entitlement);
      }
    }

    return res.status(201).json({
      message: "Entitlements created successfully",
      data: created,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};



// ✅ Get all entitlements
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



// ✅ Get user entitlements
export const getUserEntitlements = async (req, res) => {
  try {
    const { userId } = req.params;

    const data = await Entitlement.find({ user: userId })
      .populate("leaveType", "name");

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// ✅ Update entitlement
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



// ✅ Delete entitlement
export const deleteEntitlement = async (req, res) => {
  try {
    const { id } = req.params;

    await Entitlement.findByIdAndDelete(id);

    res.json({ message: "Entitlement deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
