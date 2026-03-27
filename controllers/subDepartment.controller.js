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
      organization
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
    res.status(500).json({ message: error.message });
  }
};

// ===================== GET BY DEPARTMENT =====================
export const getSubDepartmentsByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const data = await SubDepartment.find({ department: departmentId })
      .populate("department", "name")
      .populate("organization", "name");

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===================== GET BY ID =====================
export const getSubDepartmentById = async (req, res) => {
  try {
    const data = await SubDepartment.findById(req.params.id)
      .populate("department", "name")
      .populate("organization", "name");

    if (!data) {
      return res.status(404).json({ message: "SubDepartment not found." });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===================== UPDATE =====================
export const updateSubDepartment = async (req, res) => {
  try {
    const { name, department, organization } = req.body;

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
      req.params.id,
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
    res.status(500).json({ message: error.message });
  }
};

// ===================== DELETE (FIXED EXPORT) =====================
export const deleteSubDepartment = async (req, res) => {
  try {
    const deleted = await SubDepartment.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "SubDepartment not found." });
    }

    res.json({
      message: "SubDepartment deleted successfully"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
