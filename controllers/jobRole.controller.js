import JobRole from "../models/JobRole.js";

// CREATE JOB ROLE
export const createJobRole = async (req, res) => {
  try {
    const { name, department, subDepartment } = req.body;

    if (!name || !department || !subDepartment) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingRole = await JobRole.findOne({
      name,
      department,
      subDepartment,
    });

    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: "Job role already exists",
      });
    }

    const role = await JobRole.create({
      name,
      department,
      subDepartment,
    });

    res.status(201).json({
      success: true,
      message: "Job role created successfully",
      data: role,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET ALL JOB ROLES
export const getJobRoles = async (req, res) => {
  try {
    const roles = await JobRole.find()
      .populate("department", "name")
      .populate("subDepartment", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: roles.length,
      data: roles,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET JOB ROLES BY SUBDEPARTMENT
export const getRolesBySubDepartment = async (req, res) => {
  try {
    const { subDepartmentId } = req.params;

    const roles = await JobRole.find({
      subDepartment: subDepartmentId,
      status: "Active",
    });

    res.status(200).json({
      success: true,
      data: roles,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// UPDATE JOB ROLE
export const updateJobRole = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedRole = await JobRole.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (!updatedRole) {
      return res.status(404).json({
        success: false,
        message: "Job role not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Job role updated successfully",
      data: updatedRole,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// DELETE JOB ROLE
export const deleteJobRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await JobRole.findByIdAndDelete(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Job role not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Job role deleted successfully",
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
