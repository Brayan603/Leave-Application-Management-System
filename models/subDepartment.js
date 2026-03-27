import mongoose from "mongoose";

const subDepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true
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

// 🔥 Prevent duplicates under same department
subDepartmentSchema.index(
  { name: 1, department: 1 },
  { unique: true }
);

const SubDepartment = mongoose.model("SubDepartment", subDepartmentSchema);
export default SubDepartment;
