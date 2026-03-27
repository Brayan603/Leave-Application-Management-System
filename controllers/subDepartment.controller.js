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

    // Validate department
    const deptExists = await Department.findById(department);
    if (!deptExists) {
      return res.status(404).json({ message: "Department not found." });
    }

    // Validate organization
    const orgExists = await Organization.findById(organization);
    if (!orgExists) {
      return res.status(404).json({ message: "Organization not found." });
    }

    // Prevent duplicates
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
