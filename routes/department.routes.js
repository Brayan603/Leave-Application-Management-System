import express from "express";
import {
  createDepartment,
  getDepartments,
  getDepartmentsByOrganization,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
} from "../controllers/department.controllers.js";

import { protectAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// CREATE
router.post("/", protectAdmin, createDepartment);

// GET
router.get("/", getDepartments);
router.get("/organization/:organizationId", getDepartmentsByOrganization);
router.get("/:id", getDepartmentById);

// UPDATE
router.put("/:id", protectAdmin, updateDepartment);

// DELETE
router.delete("/:id", protectAdmin, deleteDepartment);

export default router;
