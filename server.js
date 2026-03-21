// backend/server.js

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";

// Routes
import authRoutes from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import orgRoutes from "./routes/org.routes.js";
import leaveRoutes from "./routes/leave.routes.js";
import departmentRoutes from "./routes/department.routes.js";
import subDepartmentRoutes from "./routes/subDepartments.routes.js";
import leaveBalanceRoutes from "./routes/leaveBalance.routes.js";
import leavesRoutes from "./routes/leaves.routes.js";

// Models
import User from "./models/User.js";
import Role from "./models/Role.js";
import Organization from "./models/Organization.js";

import bcrypt from "bcryptjs";

dotenv.config();

const app = express();

// Middleware
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("API running successfully!");
});

// Routes
app.use("/api/organizations", orgRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRouter);
app.use("/api/leave", leaveRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/subdepartments", subDepartmentRoutes);
app.use("/api/leave-balances", leaveBalanceRoutes);
app.use("/api/leaves", leavesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// =========================
// MongoDB Connection
// =========================
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};

// =========================
// Ensure Admin Setup
// =========================
const ensureAdmin = async () => {
  try {
    // 1️⃣ Ensure Role exists
    let adminRole = await Role.findOne({ name: "admin" });
    if (!adminRole) {
      adminRole = await Role.create({ name: "admin" });
      console.log("✅ Admin role created");
    }

    // 2️⃣ Ensure Organization exists
    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({
        name: "Default Organization"
      });
      console.log("✅ Default organization created");
    }

    // 3️⃣ Check if admin user exists
    const adminExists = await User.findOne({
      email: "admin@example.com"
    });

    if (!adminExists) {
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
      console.log("✅ Admin already exists");
    }

  } catch (error) {
    console.error("❌ Error creating admin:", error);
  }
};

// =========================
// Start Server
// =========================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();   // Connect DB
    await ensureAdmin(); // Setup admin, role, org

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();


    
