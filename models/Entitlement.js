import mongoose from "mongoose";

const entitlementSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    leaveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },

    // fixed or accrual
    type: {
      type: String,
      enum: ["fixed", "accrual"],
      required: true,
    },

    // max leave days
    maxDays: {
      type: Number,
      required: true,
    },

    // monthly accrual rate
    accrualRate: {
      type: Number,
      default: 0,
    },

    // current available balance
    totalDays: {
      type: Number,
      required: true,
    },

    usedDays: {
      type: Number,
      default: 0,
    },

    startDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "Entitlement",
  entitlementSchema
);
