import express from "express";
import {
  createDepartment,
  getDepartments,
  getDepartmentsByOrganization,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
} from "../controllers/department.controllers.js";

// OPTIONAL (if you have auth)
import { authMiddleware, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// ===================== CREATE =====================
// 🔒 Optional: restrict to admin
router.post("/", authMiddleware, isAdmin, createDepartment);
// If you want all users to create, use:
// router.post("/", createDepartment);


// ===================== GET =====================

// ✅ Get all departments
router.get("/", getDepartments);

// ✅ Get by organization (MUST come before :id)
router.get("/organization/:organizationId", getDepartmentsByOrganization);

// ✅ Get by ID
router.get("/:id", getDepartmentById);


// ===================== UPDATE =====================
// 🔒 Optional: admin only
router.put("/:id", authMiddleware, isAdmin, updateDepartment);


// ===================== DELETE =====================
// 🔒 Optional: admin only
router.delete("/:id", authMiddleware, isAdmin, deleteDepartment);


export default router;
