import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  leaveType: { type: mongoose.Schema.Types.ObjectId, ref: "LeaveType", required: true },
  entitlement: { type: mongoose.Schema.Types.ObjectId, ref: "Entitlement", required: true }, // ← NEW
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  days: { type: Number },
  reason: { type: String },
  status: { 
    type: String, 
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending" 
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  attachment: { type: String }
}, { timestamps: true });

const Leave = mongoose.model("Leave", leaveSchema);

export default Leave;
