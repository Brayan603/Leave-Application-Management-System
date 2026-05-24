import mongoose from "mongoose";

const entitlementSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    leaveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
      index: true,
    },

    // fixed | accrual
    type: {
      type: String,
      enum: ["fixed", "accrual"],
      required: true,
    },

    // maximum leave allowed
    maxDays: {
      type: Number,
      required: true,
      min: 0,
    },

    // accrual per month
    accrualRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    // current balance
    totalDays: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    // consumed leave
    usedDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    startDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// 🚀 Prevent duplicate entitlements
entitlementSchema.index(
  { user: 1, leaveType: 1 },
  { unique: true }
);

export default mongoose.model(
  "Entitlement",
  entitlementSchema
);
