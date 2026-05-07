import express from "express";
import User from "../models/User.js";
import Leave from "../models/LeaveType.js";
import { protectAdmin, protect } from "../middleware/auth.middleware.js";
import { createUser } from "../controllers/userController.js";

const router = express.Router();

// ============================
// CREATE USER
// ============================
router.post("/", protectAdmin, createUser);

// ============================
// GET ALL USERS
// ============================
router.get("/", protectAdmin, async (req, res) => {
  try {
    const users = await User.find();

    res.json(
      users.map((u) => ({
        id: u._id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role,
        manager: u.manager,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================
// GET MY EMPLOYEES
// ============================
router.get("/my-employees", protect, async (req, res) => {
  try {
    const managerId = req.user?.id || req.user?._id || req.user;

    const employees = await User.find({
      manager: managerId,
      role: "employee",
    });

    res.json(
      employees.map((u) => ({
        id: u._id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ============================
// GET SINGLE EMPLOYEE
// ============================
router.get("/employee/:id", protect, async (req, res) => {
  try {
    const employeeId = req.params.id;

    const employee = await User.findById(employeeId)
      .populate("department", "name")
      .select("-password");

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    const leaves = await Leave.find({
      user: employeeId,
    }).sort({
      createdAt: -1,
    });

    res.json({
      employee: {
        id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        department: employee.department,
      },
      leaves,
    });
  } catch (err) {
    console.error("EMPLOYEE DETAIL ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

export default router;























