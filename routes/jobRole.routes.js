const express = require("express");

const router = express.Router();

const {
  createJobRole,
  getJobRoles,
  getRolesBySubDepartment,
  updateJobRole,
  deleteJobRole,
} = require("../controllers/jobRole.controller");


// CREATE
router.post("/", createJobRole);

// GET ALL
router.get("/", getJobRoles);

// GET BY SUBDEPARTMENT
router.get(
  "/subdepartment/:subDepartmentId",
  getRolesBySubDepartment
);

// UPDATE
router.put("/:id", updateJobRole);

// DELETE
router.delete("/:id", deleteJobRole);

module.exports = router;
