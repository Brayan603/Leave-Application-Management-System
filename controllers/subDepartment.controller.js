import mongoose from "mongoose";
import SubDepartment from "../models/subDepartment.js";
import Department from "../models/Department.js";
import Organization from "../models/Organization.js";

// ===================== CREATE =====================
export const createSubDepartment = async (req, res) => {
  try {
    const { name, department, organization } = req.body;

    if (!name || !department || !organization) {
      return res.status(400).json({
        message: "Name, department and organization are required."
      });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(department)) {
      return res.status(400).json({ message: "Invalid department ID format." });
    }
    if (!mongoose.Types.ObjectId.isValid(organization)) {
      return res.status(400).json({ message: "Invalid organization ID format." });
    }

    const deptExists = await Department.findById(department);
    if (!deptExists) {
      return res.status(404).json({ message: "Department not found." });
    }

    const orgExists = await Organization.findById(organization);
    if (!orgExists) {
      return res.status(404).json({ message: "Organization not found." });
    }

    const existing = await SubDepartment.findOne({
      name: name.trim(),
      department,
      organization
    });

    if (existing) {
      return res.status(400).json({
        message: "SubDepartment already exists in this department."
      });
    }

    const subdepartment = new SubDepartment({
      name: name.trim(),
      department,
      organization,
      createdBy: req.user?.id
    });

    const saved = await subdepartment.save();
    const populated = await saved.populate([
      { path: "department", select: "name" },
      { path: "organization", select: "name" }
    ]);

    res.status(201).json({
      message: "SubDepartment created successfully",
      subDepartment: populated
    });

  } catch (error) {
    console.error("Create subdepartment error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ===================== GET ALL =====================
export const getSubDepartments = async (req, res) => {
  try {
    const data = await SubDepartment.find()
      .populate("department", "name")
      .populate("organization", "name")
      .sort({ createdAt: -1 });

    res.json(data);
  } catch (error) {
    console.error("Get subdepartments error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ===================== GET BY DEPARTMENT (used by both routes) =====================
export const getSubDepartmentsByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    // ✅ Validate departmentId format
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({ message: "Invalid department ID format." });
    }

    const data = await SubDepartment.find({ department: departmentId })
      .populate("department", "name")
      .populate("organization", "name");

    res.json(data);
  } catch (error) {
    console.error("Get subdepartments by department error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ===================== GET BY ID =====================
export const getSubDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid subdepartment ID format." });
    }

    const data = await SubDepartment.findById(id)
      .populate("department", "name")
      .populate("organization", "name");

    if (!data) {
      return res.status(404).json({ message: "SubDepartment not found." });
    }

    res.json(data);
  } catch (error) {
    console.error("Get subdepartment by ID error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ===================== UPDATE =====================
export const updateSubDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department, organization } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid subdepartment ID format." });
    }

    if (department && !mongoose.Types.ObjectId.isValid(department)) {
      return res.status(400).json({ message: "Invalid department ID format." });
    }
    if (organization && !mongoose.Types.ObjectId.isValid(organization)) {
      return res.status(400).json({ message: "Invalid organization ID format." });
    }

    if (department) {
      const deptExists = await Department.findById(department);
      if (!deptExists) {
        return res.status(404).json({ message: "Department not found." });
      }
    }

    if (organization) {
      const orgExists = await Organization.findById(organization);
      if (!orgExists) {
        return res.status(404).json({ message: "Organization not found." });
      }
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (department) updateData.department = department;
    if (organization) updateData.organization = organization;

    const updated = await SubDepartment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("department", "name")
      .populate("organization", "name");

    if (!updated) {
      return res.status(404).json({ message: "SubDepartment not found." });
    }

    res.json({
      message: "SubDepartment updated successfully",
      subDepartment: updated
    });

  } catch (error) {
    console.error("Update subdepartment error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ===================== DELETE =====================
export const deleteSubDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid subdepartment ID format." });
    }

    const deleted = await SubDepartment.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "SubDepartment not found." });
    }

    res.json({
      message: "SubDepartment deleted successfully"
    });

  } catch (error) {
    console.error("Delete subdepartment error:", error);
    res.status(500).json({ message: error.message });
  }
};
