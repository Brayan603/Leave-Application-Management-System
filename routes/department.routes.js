import express from "express";
import {
  createDepartment,
  getDepartments,
  getDepartmentsByOrganization,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
} from "../controllers/department.controllers.js";

// ✅ FIXED IMPORT
import { authMiddleware, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// ===================== CREATE =====================
router.post("/", authMiddleware, isAdmin, createDepartment);

// ===================== GET =====================
router.get("/", getDepartments);
router.get("/organization/:organizationId", getDepartmentsByOrganization);
router.get("/:id", getDepartmentById);

// ===================== UPDATE =====================
router.put("/:id", authMiddleware, isAdmin, updateDepartment);

// ===================== DELETE =====================
router.delete("/:id", authMiddleware, isAdmin, deleteDepartment);

export default router;
