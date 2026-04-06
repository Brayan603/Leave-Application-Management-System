import express from "express";
import {
  createEntitlement,
  getAllEntitlements,
  getUserEntitlements,
  updateEntitlement,
  deleteEntitlement,
} from "../controllers/entitlement.controller.js";

import { protectAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// Admin creates entitlement
router.post("/", protectAdmin, createEntitlement);

// Get all entitlements
router.get("/", protectAdmin, getAllEntitlements);

// Get entitlements for a specific user
router.get("/user/:userId", protectAdmin, getUserEntitlements);

// Update
router.put("/:id", protectAdmin, updateEntitlement);

// Delete
router.delete("/:id", protectAdmin, deleteEntitlement);

export default router;
