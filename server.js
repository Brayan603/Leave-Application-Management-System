// backend/server.js 
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
import leavesRoutes from "./routes/leaves.routes.js";

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

// ✅ START SERVER ONLY AFTER DB CONNECTS    //netstat -ano | findstr :5000   //taskkill /PID 12345 /F
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB(); // wait for MongoDB connection
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    process.exit(1); // stop app if DB fails
  }
};

startServer();

// # Windows PowerShell
// tasklist /FI "IMAGENAME eq node.exe"
// # Replace <PID> with the number from tasklist
// taskkill /PID <PID> /F


    
