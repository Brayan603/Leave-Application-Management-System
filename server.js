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
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

// Test root route
app.get("/", (req, res) => {
  res.send("API running successfully!");
});

// API Routes
app.use("/api/organizations", orgRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRouter);
app.use("/api/leave", leaveRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/subdepartments", subDepartmentRoutes);
app.use("/api/leave-balances", leaveBalanceRoutes);
app.use("/api/leaves", leavesRoutes);

// Catch-all route
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};

// Auto-create admin if none exists
const ensureAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: "admin" });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("123456", 10); // default password
      await User.create({
        name: "Admin",
        email: "admin@example.com",
        password: hashedPassword,
        role: "admin",
      });
      console.log("✅ Default admin created (email: admin@example.com / password: 123456)");
    } else {
      console.log("✅ Admin already exists");
    }
  } catch (error) {
    console.error("❌ Error checking/creating admin:", error);
  }
};

// START SERVER ONLY AFTER DB CONNECTS
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();       // Wait for MongoDB
    await ensureAdmin();     // Ensure admin exists
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();


    
