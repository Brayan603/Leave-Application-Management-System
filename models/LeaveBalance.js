import mongoose from "mongoose";

const LeaveBalanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "LeaveType", required: true },
  used: { type: Number, default: 0 },
  accrued: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model("LeaveBalance", LeaveBalanceSchema);
