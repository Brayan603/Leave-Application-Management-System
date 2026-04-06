import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  role:      { type: String, required: true, enum: ["admin","employee", "manager"] },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
  department:   { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  manager:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export default mongoose.model("User", userSchema);












