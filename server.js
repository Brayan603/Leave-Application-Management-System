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

dotenv.config();

const app = express();

app.use(morgan("dev"));

// 🔧 Fix CORS: allow frontend at localhost:3000 and credentials
app.use(cors({
  origin: "http://localhost:3000",  // your React app
  credentials: true                 // allow cookies/headers
}));

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
app.use("/api/entitlements", entitlementRoutes);

// Catch-all route
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ✅ START SERVER ONLY AFTER DB CONNECTS
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


// # Windows PowerShell
// tasklist /FI "IMAGENAME eq node.exe"
// # Replace <PID> with the number from tasklist
// taskkill /PID <PID> /F

// # Windows PowerShell
// tasklist /FI "IMAGENAME eq node.exe"
// # Replace <PID> with the number from tasklist
// taskkill /PID <PID> /F


    
