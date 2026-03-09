import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
}, { timestamps: true });

const Department = mongoose.model("Department", departmentSchema);
export default Department;
