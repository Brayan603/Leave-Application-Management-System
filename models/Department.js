import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  organization: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Organization", 
    required: true 
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true });

// 🔥 Prevent duplicate department names in same organization
departmentSchema.index({ name: 1, organization: 1 }, { unique: true });

const Department = mongoose.model("Department", departmentSchema);
export default Department;
