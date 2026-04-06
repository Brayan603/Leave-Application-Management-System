// models/UserLeave.js
const mongoose = require("mongoose");

const userLeaveSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "LeaveType" },
  totalDays: { type: Number, required: true },
  usedDays: { type: Number, default: 0 },
});

module.exports = mongoose.model("UserLeave", userLeaveSchema);
