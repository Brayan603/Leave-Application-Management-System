import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import connectDB from "./config/db.js";
import morgan from "morgan";
import { initSocket } from "./socket/socketHandler.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import orgRoutes from "./routes/org.routes.js";
import leaveRoutes from "./routes/leave.routes.js";
import departmentRoutes from "./routes/department.routes.js";
import subDepartmentRoutes from "./routes/subDepartments.routes.js";
import leaveBalanceRoutes from "./routes/leaveBalance.routes.js";
import entitlementRoutes from "./routes/entitlement.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import jobRoleRoutes from "./routes/jobRole.routes.js";

dotenv.config();

const app = express();

// ─── Derive __dirname for ES modules ──────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Create uploads folder if missing ──────────
const uploadPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log("✅ Created uploads directory at", uploadPath);
}

// ─── Middleware ───────────────────────────────
app.use(morgan("dev"));
app.use(cors({ origin: "https://leave-management20-systems.vercel.app", credentials: true }));
app.use(express.json());

// Serve uploaded files at /api/uploads
app.use("/api/uploads", express.static(uploadPath));

app.get("/", (req, res) => res.send("API running successfully!"));

// API routes
app.use("/api/organizations", orgRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRouter);
app.use("/api/leave", leaveRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/subdepartments", subDepartmentRoutes);
app.use("/api/job-roles", jobRoleRoutes);
app.use("/api/leave-balances", leaveBalanceRoutes);
app.use("/api/entitlements", entitlementRoutes);
app.use("/api/notifications", notificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("UNHANDLED ERROR:", err);
  res.status(err.statusCode || 500).json({ success: false, message: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    console.log("🟢 Connected to DB: leave-management-system");

    const httpServer = http.createServer(app);
    const io = initSocket(httpServer);
    app.set("io", io);

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔌 Socket.IO ready`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

    
