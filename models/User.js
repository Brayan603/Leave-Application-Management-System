import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName:  { type: String, required: true },
    email:     { type: String, required: true, unique: true },
    password:  { type: String, required: true },
    role:      { type: String, required: true, enum: ["admin", "employee", "manager"] },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
    department:   { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    manager:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // ===== New maintenance fields =====
    status: {
      type: String,
      enum: ["active", "disabled", "closed"],
      default: "active",
    },
    authorized: {
      type: Boolean,
      default: false,          // admin must authorize after creation
    },
    sessions: [
      {
        token: String,
        device: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    // =================================
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
























