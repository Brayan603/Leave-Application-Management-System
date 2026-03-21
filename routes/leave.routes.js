import express from "express";
import { applyLeave, getLeaveTypes } from "../controllers/leave.controller.js";

const router = express.Router();

router.post("/apply", applyLeave);
router.get("/leave", getLeaveTypes);

export default router;






