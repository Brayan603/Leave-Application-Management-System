import SubDepartment from "../models/SubDepartment.js";

// Create SubDepartment
export const createSubDepartment = async (req, res) => {
  const { name, departmentId } = req.body;

  if (!name || !departmentId) {
    return res.status(400).json({ message: "Name and department are required." });
  }

  try {
    const subdepartment = new SubDepartment({ name, departmentId });
    const saved = await subdepartment.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all subdepartments
export const getSubDepartments = async (req, res) => {
  try {
    const subdepartments = await SubDepartment.find();
    res.json(subdepartments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get subdepartments by department
export const getSubDepartmentsByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const subdepartments = await SubDepartment.find({ departmentId });
    res.json(subdepartments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update subdepartment by ID
export const updateSubDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await SubDepartment.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete subdepartment by ID
export const deleteSubDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    await SubDepartment.findByIdAndDelete(id);
    res.json({ message: "Subdepartment deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
