import express from "express";
import {
    createDepartment,
    getDepartments,
    getDepartmentsByOrganization,
    getDepartmentById,
    updateDepartment,
    deleteDepartment
} from "../controllers/department.controllers.js";

const router = express.Router();

router.post("/", createDepartment);
router.get("/", getDepartments);
router.get("/:id", getDepartmentById);
router.get("/organization/:organizationId", getDepartmentsByOrganization);
router.put("/:id", updateDepartment);
router.delete("/:id", deleteDepartment);

export default router;
