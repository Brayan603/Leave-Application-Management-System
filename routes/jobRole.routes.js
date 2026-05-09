import express from "express";

const router = express.Router();

import {
  createJobRole,
  getJobRoles,
  getRolesBySubDepartment,
  updateJobRole,
  deleteJobRole,
} from "../controllers/jobRole.controller.js";

// CREATE
router.post("/", createJobRole);

// GET ALL
router.get("/", getJobRoles);

// GET BY SUBDEPARTMENT
router.get("/subdepartment/:subDepartmentId", getRolesBySubDepartment);

// UPDATE
router.put("/:id", updateJobRole);

// DELETE
router.delete("/:id", deleteJobRole);

// ✅ IMPORTANT
export default router;
