import Department from "../models/Department.js";
import Organization from "../models/Organization.js";

// ===================== CREATE =====================
export const createDepartment = async (req, res) => {
  try {
    const { name, organization } = req.body;

    if (!name || !organization) {
      return res.status(400).json({
        message: "Name and organization are required.",
      });
    }

    const cleanName = name.trim();

    // 🔍 Check organization exists
    const orgExists = await Organization.findById(organization);
    if (!orgExists) {
      return res.status(404).json({
        message: "Organization not found.",
      });
    }

    // 🔥 CASE-INSENSITIVE DUPLICATE CHECK
    const existing = await Department.findOne({
      organization,
      name: { $regex: `^${cleanName}$`, $options: "i" },
    });

    if (existing) {
      return res.status(400).json({
        message: "Department already exists in this organization.",
      });
    }

    const department = new Department({
      name: cleanName,
      organization,
      createdBy: req.user?.id,
    });

    const savedDept = await department.save();

    await savedDept.populate("organization", "name code");

    res.status(201).json({
      message: "Department created successfully",
      department: savedDept,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// ===================== GET ALL =====================
export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find()
      .populate("organization", "name code")
      .sort({ createdAt: -1 });

    res.json(departments);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// ===================== GET BY ORGANIZATION =====================
export const getDepartmentsByOrganization = async (req, res) => {
  try {
    const { organizationId } = req.params;

    const departments = await Department.find({
      organization: organizationId,
    })
      .populate("organization", "name code")
      .sort({ createdAt: -1 });

    res.json(departments);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// ===================== GET BY ID =====================
export const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate("organization", "name code");

    if (!department) {
      return res.status(404).json({
        message: "Department not found.",
      });
    }

    res.json(department);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// ===================== UPDATE =====================
export const updateDepartment = async (req, res) => {
  try {
    const { name, organization } = req.body;

    const cleanName = name?.trim();

    if (organization) {
      const orgExists = await Organization.findById(organization);
      if (!orgExists) {
        return res.status(404).json({
          message: "Organization not found.",
        });
      }
    }

    // 🔥 FIXED DUPLICATE CHECK (IMPORTANT)
    if (cleanName && organization) {
      const existing = await Department.findOne({
        organization,
        name: { $regex: `^${cleanName}$`, $options: "i" },
        _id: { $ne: req.params.id },
      });

      if (existing) {
        return res.status(400).json({
          message: "Department already exists in this organization.",
        });
      }
    }

    const updateData = {};
    if (cleanName) updateData.name = cleanName;
    if (organization) updateData.organization = organization;

    const updatedDept = await Department.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("organization", "name code");

    if (!updatedDept) {
      return res.status(404).json({
        message: "Department not found.",
      });
    }

    res.json({
      message: "Department updated successfully",
      department: updatedDept,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// ===================== DELETE =====================
export const deleteDepartment = async (req, res) => {
  try {
    const deletedDept = await Department.findByIdAndDelete(req.params.id);

    if (!deletedDept) {
      return res.status(404).json({
        message: "Department not found.",
      });
    }

    res.json({
      message: "Department deleted successfully",
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
