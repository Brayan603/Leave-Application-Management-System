import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import morgan from "morgan";

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

dotenv.config();

const app = express();

app.use(morgan("dev"));

app.use(
  cors({
    origin: "https://leave-management20-systems.vercel.app",
    credentials: true,
  })
);

app.use(express.json());

// ============================
// ROOT ROUTE
// ============================
app.get("/", (req, res) => {
  res.send("API running successfully!");
});

// ============================
// API ROUTES
// ============================
app.use("/api/organizations", orgRoutes);
app.use("/api/auth", authRoutes);

// ✅ FIXED HERE
app.use("/api/users", userRouter);

app.use("/api/leave", leaveRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/subdepartments", subDepartmentRoutes);
app.use("/api/leave-balances", leaveBalanceRoutes);
app.use("/api/entitlements", entitlementRoutes);
app.use("/api/notifications", notificationRoutes);

// ============================
// 404 HANDLER
// ============================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// ============================
// START SERVER
// ============================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    process.exit(1);
  }
};

startServer();


    
