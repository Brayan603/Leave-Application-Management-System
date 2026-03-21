import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./src/models/User.js"; // adjust path if needed

dotenv.config();

const run = async () => {
  try {
    // 1️⃣ Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    // 2️⃣ Hash the password
    const hashedPassword = await bcrypt.hash("123456", 10); // you can change the password

    // 3️⃣ Create admin user
    const admin = await User.create({
      name: "Admin",
      email: "admin@example.com",
      password: hashedPassword,
      role: "admin"
    });

    console.log("Admin user created:", admin);
    process.exit();
  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exit(1);
  }
};

run();

