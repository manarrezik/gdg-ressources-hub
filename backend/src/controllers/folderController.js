import Folder from "../models/Folder.js";
import Resource from "../models/Resource.js";
import Department from "../models/Department.js";
import mongoose from "mongoose";

/**
 * ✅ Create a new folder
 */
export const createFolder = async (req, res) => {
  try {
    const { name, slug, description, department, color, icon, createdBy, order } = req.body;

    console.log("📁 Creating folder:", name);

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Folder name is required",
      });
    }

    if (!department || !department.trim()) {
      return res.status(400).json({
        success: false,
        message: "Department is required",
      });
    }

    // Validate department ObjectId
    if (!mongoose.Types.ObjectId.isValid(department.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
    }

    // Check if department exists
    const deptExists = await Department.findById(department.trim());
    if (!deptExists) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    // Check if folder with same name already exists in this department
    const existingFolder = await Folder.findOne({
      name: name.trim(),
      department: department.trim(),
      isActive: true,
    });

    if (existingFolder) {
      return res.status(400).json({
        success: false,
        message: "Folder with this name already exists in this department",
      });
    }

    // Validate createdBy if provided
    if (createdBy && createdBy.trim() && !mongoose.Types.ObjectId.isValid(createdBy.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid createdBy user ID",
      });
    }

    // Create folder
    const folder = await Folder.create({
      name: name.trim(),
      slug: slug ? slug.trim() : undefined, // Will auto-generate if not provided
      description: description ? description.trim() : "",
      department: department.trim(),
      color: color || "#3B82F6",
      icon: icon || "📁",
      createdBy: createdBy && createdBy.trim() ? createdBy.trim() : null,
      order: order || 0,
    });

    console.log("✅ Folder created:", folder._id);

    // Update department folder count
    await Department.findByIdAndUpdate(department.trim(), {
      $inc: { folderCount: 1 },
    });

    // Populate references
    await folder.populate([
      { path: "department", select: "name slug icon color" },
      { path: "createdBy", select: "name email" },
    ]);

    res.status(201).json({
      success: true,
      message: "Folder created successfully",
      data: folder,
    });
  } catch (error) {
    console.error("❌ Error creating folder:", error);
    res.status(500).json({
      success: false,
      message: "Error creating folder",
      error: error.message,
    });
  }
};

/**
 * 📚 Get all folders
 */
export const getFolders = async (req, res) => {
  try {
    const { department, search, isActive = true } = req.query;

    console.log("🔍 Fetching folders...");

    // Build query
    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === "true" || isActive === true;
    }

    if (department && department !== "all") {
      if (!mongoose.Types.ObjectId.isValid(department)) {
        return res.status(400).json({
          success: false,
          message: "Invalid department ID",
        });
      }
      query.department = department;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const folders = await Folder.find(query)
      .populate("department", "name slug icon color")
      .populate("createdBy", "name email")
      .sort({ order: 1, createdAt: -1 }); // Sort by order, then newest first

    console.log(`✅ Found ${folders.length} folders`);

    res.status(200).json({
      success: true,
      count: folders.length,
      data: folders,
    });
  } catch (error) {
    console.error("❌ Error fetching folders:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching folders",
      error: error.message,
    });
  }
};

/**
 * 📋 Get folders by department
 */
export const getFoldersByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    console.log("📋 Fetching folders for department:", departmentId);

    // Validate department ID
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
    }

    // Check if department exists
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    const folders = await Folder.find({
      department: departmentId,
      isActive: true,
    })
      .populate("createdBy", "name email")
      .sort({ order: 1, name: 1 });

    console.log(`✅ Found ${folders.length} folders`);

    res.status(200).json({
      success: true,
      department: {
        _id: department._id,
        name: department.name,
        slug: department.slug,
      },
      count: folders.length,
      data: folders,
    });
  } catch (error) {
    console.error("❌ Error fetching folders:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching folders",
      error: error.message,
    });
  }
};

/**
 * 🔍 Get single folder by ID
 */
export const getFolder = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("🔍 Fetching folder:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid folder ID",
      });
    }

    const folder = await Folder.findById(id)
      .populate("department", "name slug icon color")
      .populate("createdBy", "name email");

    if (!folder || !folder.isActive) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }

    // Get resource count
    const resourceCount = await Resource.countDocuments({
      folder: id,
      isActive: true,
    });

    folder.resourceCount = resourceCount;
    await folder.save();

    console.log("✅ Folder fetched");

    res.status(200).json({
      success: true,
      data: folder,
    });
  } catch (error) {
    console.error("❌ Error fetching folder:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching folder",
      error: error.message,
    });
  }
};

/**
 * ✏️ Update folder
 */
export const updateFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, color, icon, order } = req.body;

    console.log("✏️ Updating folder:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid folder ID",
      });
    }

    const folder = await Folder.findById(id);

    if (!folder || !folder.isActive) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }

    // Check if new name already exists in same department
    if (name && name.trim() !== folder.name) {
      const existingFolder = await Folder.findOne({
        name: name.trim(),
        department: folder.department,
        isActive: true,
        _id: { $ne: id }, // Exclude current folder
      });

      if (existingFolder) {
        return res.status(400).json({
          success: false,
          message: "Folder with this name already exists in this department",
        });
      }
    }

    // Update fields
    if (name) folder.name = name.trim();
    if (slug) folder.slug = slug.trim();
    if (description !== undefined) folder.description = description.trim();
    if (color) folder.color = color;
    if (icon) folder.icon = icon;
    if (order !== undefined) folder.order = order;

    await folder.save();
    await folder.populate([
      { path: "department", select: "name slug icon color" },
      { path: "createdBy", select: "name email" },
    ]);

    console.log("✅ Folder updated");

    res.status(200).json({
      success: true,
      message: "Folder updated successfully",
      data: folder,
    });
  } catch (error) {
    console.error("❌ Error updating folder:", error);
    res.status(500).json({
      success: false,
      message: "Error updating folder",
      error: error.message,
    });
  }
};

/**
 * 🗑️ Delete folder (soft delete)
 */
export const deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { moveResourcesTo } = req.body; // Optional: Move resources to another folder

    console.log("🗑️ Deleting folder:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid folder ID",
      });
    }

    const folder = await Folder.findById(id);

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }

    // Check if folder has resources
    const resourceCount = await Resource.countDocuments({
      folder: id,
      isActive: true,
    });

    if (resourceCount > 0) {
      if (moveResourcesTo) {
        // Validate target folder
        if (!mongoose.Types.ObjectId.isValid(moveResourcesTo)) {
          return res.status(400).json({
            success: false,
            message: "Invalid target folder ID",
          });
        }

        const targetFolder = await Folder.findById(moveResourcesTo);
        if (!targetFolder || !targetFolder.isActive) {
          return res.status(404).json({
            success: false,
            message: "Target folder not found",
          });
        }

        // Move resources to target folder
        await Resource.updateMany(
          { folder: id, isActive: true },
          { folder: moveResourcesTo }
        );

        console.log(`📦 Moved ${resourceCount} resources to folder: ${moveResourcesTo}`);

        // Update resource counts
        await Folder.findByIdAndUpdate(moveResourcesTo, {
          $inc: { resourceCount: resourceCount },
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `Cannot delete folder with ${resourceCount} resources. Please move or delete resources first, or provide 'moveResourcesTo' folder ID.`,
        });
      }
    }

    // Soft delete folder
    folder.isActive = false;
    await folder.save();

    // Update department folder count
    await Department.findByIdAndUpdate(folder.department, {
      $inc: { folderCount: -1 },
    });

    console.log("✅ Folder deleted (soft delete)");

    res.status(200).json({
      success: true,
      message: "Folder deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting folder:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting folder",
      error: error.message,
    });
  }
};

/**
 * 📊 Get folder statistics
 */
export const getFolderStats = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("📊 Fetching stats for folder:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid folder ID",
      });
    }

    const folder = await Folder.findById(id).populate("department", "name slug");

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }

    // Get resource stats
    const stats = await Resource.aggregate([
      {
        $match: {
          folder: new mongoose.Types.ObjectId(id),
          isActive: true,
        },
      },
      {
        $group: {
          _id: null,
          totalResources: { $sum: 1 },
          totalViews: { $sum: "$views" },
          totalDownloads: { $sum: "$downloads" },
          totalFiles: { $sum: { $cond: [{ $eq: ["$type", "file"] }, 1, 0] } },
          totalLinks: { $sum: { $cond: [{ $eq: ["$type", "link"] }, 1, 0] } },
          totalSize: { $sum: "$size" },
        },
      },
    ]);

    // Get popular resources
    const popularResources = await Resource.find({
      folder: id,
      isActive: true,
    })
      .sort({ views: -1 })
      .limit(5)
      .select("title views downloads url type");

    // Get recent resources
    const recentResources = await Resource.find({
      folder: id,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("uploadedBy", "name email")
      .select("title type url createdAt");

    console.log("✅ Stats fetched");

    res.status(200).json({
      success: true,
      data: {
        folder: {
          _id: folder._id,
          name: folder.name,
          slug: folder.slug,
          color: folder.color,
          icon: folder.icon,
          department: folder.department,
        },
        stats: stats[0] || {
          totalResources: 0,
          totalViews: 0,
          totalDownloads: 0,
          totalFiles: 0,
          totalLinks: 0,
          totalSize: 0,
        },
        popularResources,
        recentResources,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching folder statistics",
      error: error.message,
    });
  }
};

/**
 * 📋 Get resources in folder
 */
export const getFolderResources = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    console.log("📋 Fetching resources for folder:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid folder ID",
      });
    }

    // Build query
    const query = {
      folder: id,
      isActive: true,
    };

    if (type && type !== "all") {
      query.type = type;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const resources = await Resource.find(query)
      .populate("department", "name slug icon color")
      .populate("uploadedBy", "name email")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Resource.countDocuments(query);

    console.log(`✅ Found ${resources.length} resources`);

    res.status(200).json({
      success: true,
      count: resources.length,
      data: resources,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching folder resources:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching folder resources",
      error: error.message,
    });
  }
};