import bcrypt from "bcryptjs";
import User from "../models/User.js";

export const createAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ email: "admin@gmail.com" });

    if (existingAdmin) {
      console.log("✅ Admin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash("123456", 10);

    await User.create({
      firstName: "System",
      lastName: "Admin",
      email: "admin@gmail.com",
      password: hashedPassword, // ✅ CRITICAL
      organization: "64f000000000000000000000" // ⚠️ replace with real ID
    });

    console.log("✅ Admin created");

  } catch (error) {
    console.error("❌ Error creating admin:", error);
  }
};
