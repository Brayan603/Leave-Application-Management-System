// routes/leaveBalance.routes.js
import express from "express";
import { assignLeaveToUser } from "../controllers/leaveBalance.controller.js";

const router = express.Router();

// POST /api/leave-balances/assign
router.post("/assign", assignLeaveToUser);

export default router;
