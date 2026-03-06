// routes/organizations.js
import express from "express";
import Organization from "../models/Organization.js";

const router = express.Router();

/*
GET ALL ORGANIZATIONS
*/
router.get("/", async (req, res) => {
  try {
    const orgs = await Organization
      .find({ isActive: true }) // better than isDeleted if your model uses isActive
      .select("_id name code")
      .sort({ name: 1 });

    res.status(200).json(orgs);
  } catch (err) {
    console.error("Error fetching organizations:", err);
    res.status(500).json({ message: "Server error while fetching organizations" });
  }
});

/*
CREATE ORGANIZATION
*/
router.post("/", async (req, res) => {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        message: "Name and code are required",
      });
    }

    // Check duplicate name or code
    const existing = await Organization.findOne({
      $or: [
        { name: name.trim() },
        { code: code.trim() }
      ]
    });

    if (existing) {
      return res.status(409).json({
        message: "Organization with same name or code already exists",
      });
    }

    const newOrg = new Organization({
      name: name.trim(),
      code: code.trim(),
      isActive: true,
    });

    const savedOrg = await newOrg.save();

    res.status(201).json(savedOrg);

  } catch (err) {
    console.error("Create organization error:", err);
    res.status(500).json({
      message: "Server error while creating organization",
    });
  }
});

export default router;
