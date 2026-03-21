// src/routes/auth.routes.js
import express from "express";
import { loginAdmin } from "../controllers/auth.controller.js";

const router = express.Router();

// POST /api/auth/login
router.post("/login", loginAdmin);

export default router;














