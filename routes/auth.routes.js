import express from "express";
import { loginUser } from "../controllers/auth.controller.js";

const router = express.Router();

// 🔥 MUST BE PUBLIC
router.post("/login", loginUser);

export default router;














