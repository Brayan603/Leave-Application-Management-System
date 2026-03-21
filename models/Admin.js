import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true, // 🔥 normalize
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
});

export default mongoose.model("Admin", adminSchema);
