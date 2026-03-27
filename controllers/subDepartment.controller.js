import SubDepartment from "../models/subDepartment.js";
import Department from "../models/Department.js";

// ===================== CREATE =====================
export const createSubDepartment = async (req, res) => {
  try {
    const { name, departmentId } = req.body;

    if (!name || !departmentId) {
      return res.status(400).json({
        message: "Name and department are required."
      });
    }

    // 🔍 Check if department exists
    const deptExists = await Department.findById(departmentId);
    if (!deptExists) {
      return res.status(404).json({ message: "Department not found." });
    }

    // 🔥 Prevent duplicate subDepartment in same department
    const existing = await SubDepartment.findOne({
      name: name.trim(),
      departmentId
    });

    if (existing) {
      return res.status(400).json({
        message: "SubDepartment already exists in this department."
      });
    }

    const subdepartment = new SubDepartment({
      name: name.trim(),
      departmentId
    });

    const saved = await subdepartment.save();

    // Optional populate
    await saved.populate("departmentId", "name");

    res.status(201).json({
      message: "SubDepartment created successfully",
      subDepartment: saved
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ===================== GET ALL =====================
export const getSubDepartments = async (req, res) => {
  try {
    const subdepartments = await SubDepartment.find()
      .populate("departmentId", "name")
      .sort({ createdAt: -1 });

    res.json(subdepartments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ===================== GET BY DEPARTMENT =====================
export const getSubDepartmentsByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const subdepartments = await SubDepartment.find({ departmentId })
      .populate("departmentId", "name");

    res.json(subdepartments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ===================== GET BY ID =====================
export const getSubDepartmentById = async (req, res) => {
  try {
    const subdepartment = await SubDepartment.findById(req.params.id)
      .populate("departmentId", "name");

    if (!subdepartment) {
      return res.status(404).json({ message: "SubDepartment not found." });
    }

    res.json(subdepartment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ===================== UPDATE =====================
export const updateSubDepartment = async (req, res) => {
  try {
    const { name, departmentId } = req.body;

    // 🔍 Validate department if updating
    if (departmentId) {
      const deptExists = await Department.findById(departmentId);
      if (!deptExists) {
        return res.status(404).json({ message: "Department not found." });
      }
    }

    // 🔥 Prevent duplicate
    if (name && departmentId) {
      const existing = await SubDepartment.findOne({
        name: name.trim(),
        departmentId,
        _id: { $ne: req.params.id }
      });

      if (existing) {
        return res.status(400).json({
          message: "SubDepartment already exists in this department."
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (departmentId) updateData.departmentId = departmentId;

    const updated = await SubDepartment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("departmentId", "name");

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



// ===================== DELETE =====================
export const deleteSubDepartment = async (req, res) => {
  try {
    const deleted = await SubDepartment.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "SubDepartment not found." });
    }

    res.json({ message: "SubDepartment deleted successfully." });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
