// routes/subDepartment.routes.js
import express from "express";
import {
  createSubDepartment,
  getSubDepartments,
  getSubDepartmentsByDepartment,
  updateSubDepartment,
  deleteSubDepartment
} from "../controllers/subDepartment.controller.js";

const router = express.Router();

// Create a new subdepartment
router.post("/", createSubDepartment);

// Get all subdepartments
router.get("/", getSubDepartments);

// Get subdepartments by department ID
router.get("/by-department/:departmentId", getSubDepartmentsByDepartment);

// Update a subdepartment by ID
router.put("/:id", updateSubDepartment);

// Delete a subdepartment by ID
router.delete("/:id", deleteSubDepartment);

export default router;
