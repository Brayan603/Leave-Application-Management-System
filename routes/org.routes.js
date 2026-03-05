// routes/organizations.js
import express from "express";
import Organization from "../models/Organization.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const orgs = await Organization
      .find({ isDeleted: false })
      .select("_id name code"); // ✅ include code
    res.status(200).json(orgs); // plain array
  } catch (err) {
    console.error("Error fetching organizations:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: "name and code are required" });
    }

    const existing = await Organization.findOne({ $or: [{ name }, { code }] });
    if (existing) {
      return res.status(400).json({ message: "Organization with same name or code exists" });
    }

    const org = new Organization({ name, code });
    await org.save();
    res.status(201).json(org);
  } catch (err) {
    console.error("Create org error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
