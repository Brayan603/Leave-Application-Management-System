import mongoose from "mongoose";

const subDepartmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
}, { timestamps: true });

const SubDepartment = mongoose.model("SubDepartment", subDepartmentSchema);
export default SubDepartment;
