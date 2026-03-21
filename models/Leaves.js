// models/LeaveType.js
import mongoose from "mongoose";

const leavesSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["fixed", "accrual"], required: true },
    maxDays: { type: Number, default: 0 },
    accrualRate: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Leaves", leavesSchema);
