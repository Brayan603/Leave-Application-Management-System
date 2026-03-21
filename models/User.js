import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },

    email: { type: String, required: true, unique: true },

    // ✅ FIX: Add password field
    password: {
      type: String,
      required: true,
      select: false // 🔒 hide password by default
    },

    phone: String,

    employeeId: { type: String, unique: true },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department"
    },

    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role"
    },

    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    dateJoined: { type: Date, default: Date.now },

    employmentType: {
      type: String,
      enum: ["Full-Time", "Part-Time", "Contract", "Intern"],
      default: "Full-Time"
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);




