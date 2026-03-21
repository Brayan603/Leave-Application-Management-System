// src/utils/ensureAdmin.js
import User from "../models/User.js";
import Role from "../models/Role.js";
import Organization from "../models/Organization.js";
import bcrypt from "bcryptjs";

export const ensureAdmin = async () => {
  try {
    // 1️⃣ Ensure admin role exists
    let adminRole = await Role.findOne({ name: "admin" });
    if (!adminRole) {
      adminRole = await Role.create({ name: "admin" });
      console.log("✅ Admin role created");
    }

    // 2️⃣ Ensure an organization exists (required field)
    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({ name: "Default Organization" });
      console.log("✅ Default organization created");
    }

    // 3️⃣ Check if admin user exists
    const adminExists = await User.findOne({ email: "admin@example.com" });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("123456", 10);
      await User.create({
        firstName: "Admin",
        lastName: "User",
        email: "admin@example.com",
        organization: org._id,   // assign ObjectId
        role: adminRole._id,     // assign ObjectId
        password: hashedPassword
      });
      console.log("✅ Admin user created (email: admin@example.com / password: 123456)");
    } else {
      console.log("✅ Admin user already exists");
    }
  } catch (error) {
    console.error("❌ Error creating admin:", error);
  }
};
