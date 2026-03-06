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
import leaveTypeRoutes from "./routes/leaveType.routes.js";
import departmentRoutes from "./routes/department.routes.js";

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
app.use("/api/organizations1", orgRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRouter);
app.use("/api/leavetypes", leaveTypeRoutes);
app.use("/api/department", departmentRoutes);

// Catch-all route
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ✅ START SERVER ONLY AFTER DB CONNECTS
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  let retries = 5;

  while (retries > 0) {
    try {
      await connectDB(); // wait for MongoDB connection
      console.log("✅ Database connected successfully");

      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });

      return; // stop retry loop if successful
    } catch (error) {
      console.error("❌ Database connection failed. Retrying in 5 seconds...");
      retries--;
      await new Promise((res) => setTimeout(res, 5000));
    }
  }

  console.error("❌ Could not connect to database after multiple attempts.");
  process.exit(1);
};

startServer();
