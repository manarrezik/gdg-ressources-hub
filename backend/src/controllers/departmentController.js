import Department from "../models/Department.js";
import Resource from "../models/Resource.js";
import mongoose from "mongoose";

export const createDepartment = async (req, res) => {
  try {
    const { name, slug, description, icon, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Department name is required",
      });
    }


    const existingDept = await Department.findOne({
      $or: [
        { name: name.trim() },
        { slug: slug ? slug.trim().toLowerCase() : name.toLowerCase() },
      ],
    });

    if (existingDept) {
      return res.status(400).json({
        success: false,
        message: "Department with this name already exists",
      });
    }

 
    const department = await Department.create({
      name: name.trim(),
      slug: slug ? slug.trim().toLowerCase() : undefined,
      description: description?.trim() || "",
      icon: icon || "📁",
      color: color || "#3B82F6",
    });

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department,
    });
  } catch (error) {
    console.error("❌ Error creating department:", error);
    res.status(500).json({
      success: false,
      message: "Error creating department",
      error: error.message,
    });
  }
};


 
export const getDepartments = async (req, res) => {
  try {
    const { search, isActive } = req.query;

    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === "true" || isActive === true;
    }
    if (search) {
      query.$text = { $search: search };
    }

    const departments = await Department.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: departments.length,
      data: departments,
    });
  } catch (error) {
    console.error("❌ Error fetching departments:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching departments",
      error: error.message,
    });
  }
};


export const getDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    let department;

    if (mongoose.Types.ObjectId.isValid(id)) {
      department = await Department.findById(id);
    } else {
      department = await Department.findOne({ slug: id });
    }

    if (!department || !department.isActive) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    
    const resourceCount = await Resource.countDocuments({
      department: department._id,
    });
    department.resourceCount = resourceCount;
    await department.save();

    res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error) {
    console.error("❌ Error fetching department:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching department",
      error: error.message,
    });
  }
};


export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, icon, color } = req.body;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    if (name) department.name = name.trim();
    if (slug) department.slug = slug.trim().toLowerCase();
    if (description !== undefined) department.description = description.trim();
    if (icon) department.icon = icon;
    if (color) department.color = color;

    await department.save();

    res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: department,
    });
  } catch (error) {
    console.error("❌ Error updating department:", error);
    res.status(500).json({
      success: false,
      message: "Error updating department",
      error: error.message,
    });
  }
};


 
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    const resourceCount = await Resource.countDocuments({
      department: id,
    });

    if (resourceCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department with ${resourceCount} resources.`,
      });
    }

    department.isActive = false;
    await department.save();

    res.status(200).json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting department:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting department",
      error: error.message,
    });
  }
};


export const getDepartmentStats = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    const stats = await Resource.aggregate([
      {
        $match: {
          department: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $group: {
          _id: null,
          totalResources: { $sum: 1 },
          totalFiles: { $sum: { $cond: [{ $eq: ["$type", "file"] }, 1, 0] } },
          totalLinks: { $sum: { $cond: [{ $eq: ["$type", "link"] }, 1, 0] } },
          totalSize: { $sum: "$size" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        department: {
          _id: department._id,
          name: department.name,
          slug: department.slug,
        },
        stats: stats[0] || {
          totalResources: 0,
          totalFiles: 0,
          totalLinks: 0,
          totalSize: 0,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching department statistics",
      error: error.message,
    });
  }
};
