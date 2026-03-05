// models/Organization.js
import mongoose from "mongoose";

const OrganizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true }, // ✅ include this
    registrationNumber: String,
    email: String,
    phone: String,
    address: String,
    status: { type: String, default: "active" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Organization", OrganizationSchema);

