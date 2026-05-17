import express from "express";
import {
  createSubDepartment,
  getSubDepartments,
  getSubDepartmentsByDepartment, // renamed controller? keep as is but route changed
  getSubDepartmentById,
  updateSubDepartment,
  deleteSubDepartment
} from "../controllers/subDepartment.controller.js";

const router = express.Router();

// Create a new subdepartment
router.post("/", createSubDepartment);

// Get all subdepartments
router.get("/", getSubDepartments);

// ✅ NEW ROUTE: get subdepartments by department ID (matches frontend URL)
router.get("/department/:departmentId", getSubDepartmentsByDepartment);

// Keep the old route for backward compatibility (optional)
router.get("/by-department/:departmentId", getSubDepartmentsByDepartment);

// Get a single subdepartment by ID
router.get("/:id", getSubDepartmentById);

// Update a subdepartment by ID
router.put("/:id", updateSubDepartment);

// Delete a subdepartment by ID
router.delete("/:id", deleteSubDepartment);

export default router;
