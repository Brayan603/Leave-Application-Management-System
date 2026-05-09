import mongoose from "mongoose";

const JobRoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    subDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubDepartment",
      required: true,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

const JobRole = mongoose.model("JobRole", JobRoleSchema);

export default JobRole;
