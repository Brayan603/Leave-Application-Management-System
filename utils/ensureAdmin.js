// src/utils/ensureAdmin.js

import User from "../models/User.js";
import Role from "../models/Role.js";
import Organization from "../models/Organization.js";
import bcrypt from "bcryptjs";

export const ensureAdmin = async () => {
  try {
    // =========================
    // 1️⃣ Ensure Admin Role
    // =========================
    let adminRole = await Role.findOne({ name: "admin" });

    if (!adminRole) {
      adminRole = await Role.create({ name: "admin" });
      console.log("✅ Admin role created");
    }

    // =========================
    // 2️⃣ Ensure Organization
    // =========================
    let org = await Organization.findOne();

    if (!org) {
      org = await Organization.create({
        name: "Default Organization"
      });
      console.log("✅ Default organization created");
    }

    // =========================
    // 3️⃣ Ensure Admin User
    // =========================
    let admin = await User.findOne({ email: "admin@example.com" });

    if (!admin) {
      // 🔹 Create new admin
      const hashedPassword = await bcrypt.hash("123456", 10);

      await User.create({
        firstName: "Admin",
        lastName: "User",
        email: "admin@example.com",
        password: hashedPassword,
        organization: org._id,
        role: adminRole._id
      });

      console.log("✅ Admin user created");
      console.log("📧 Email: admin@example.com");
      console.log("🔑 Password: 123456");

    } else {
      // 🔥 FIX EXISTING ADMIN (this solves your current error)
      let updated = false;

      if (!admin.password) {
        admin.password = await bcrypt.hash("123456", 10);
        updated = true;
        console.log("🔧 Fixed missing password");
      }

      if (!admin.role) {
        admin.role = adminRole._id;
        updated = true;
        console.log("🔧 Fixed missing role");
      }

      if (!admin.organization) {
        admin.organization = org._id;
        updated = true;
        console.log("🔧 Fixed missing organization");
      }

      if (updated) {
        await admin.save();
        console.log("✅ Existing admin updated successfully");
      } else {
        console.log("✅ Admin already exists and is valid");
      }
    }

  } catch (error) {
    console.error("❌ Error in ensureAdmin:", error);
  }
};
