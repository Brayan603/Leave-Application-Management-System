// routes/leaveType.routes.js
import express from "express";
import {
  getLeaveTypes,
  createLeaveType,
  deleteLeaveType,
} from "../controllers/leaves.controller.js";

const router = express.Router();

router.get("/", getLeaveTypes);
router.post("/", createLeaveType);
router.delete("/:id", deleteLeaveType);

export default router;







