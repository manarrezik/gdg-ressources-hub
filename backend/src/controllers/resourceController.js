import Resource from "../models/Resource.js";
import cloudinary from "../config/cloudinary.js";
import mongoose from "mongoose";

 
export const createResource = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      type, 
      department, 
      folder,
      url, 
      linkType,
      tags,
      contributors,
      uploadedBy
    } = req.body;


    if (!title || !title.trim()) {
      return res.status(400).json({ 
        success: false,
        message: "Title is required" 
      });
    }

    if (!type) {
      return res.status(400).json({ 
        success: false,
        message: "Type is required (file or link)" 
      });
    }

    if (!department || !department.trim()) {
      return res.status(400).json({ 
        success: false,
        message: "Department is required" 
      });
    }

  
    if (!mongoose.Types.ObjectId.isValid(department.trim())) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid department ID format" 
      });
    }


    if (folder && folder.trim() && !mongoose.Types.ObjectId.isValid(folder.trim())) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid folder ID format" 
      });
    }


    if (uploadedBy && uploadedBy.trim() && !mongoose.Types.ObjectId.isValid(uploadedBy.trim())) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid uploadedBy ID format" 
      });
    }

    let uploadResult = null;


    if (type === "file") {
      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          message: "No file uploaded" 
        });
      }

      console.log("☁️ Uploading file to Cloudinary...");

      uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { 
              resource_type: "auto",
              folder: `gdg-resources/${department.trim()}`,
            },
            (error, result) => {
              if (error) {
                console.error("❌ Cloudinary upload error:", error);
                reject(error);
              } else {
                console.log("✅ File uploaded:", result.secure_url);
                resolve(result);
              }
            }
          )
          .end(req.file.buffer);
      });
    }

    if (type === "link" && (!url || !url.trim())) {
      return res.status(400).json({ 
        success: false,
        message: "URL is required for link type" 
      });
    }


    const resourceData = {
      title: title.trim(),
      description: description ? description.trim() : "",
      type,
      department: department.trim(),
      url: type === "file" ? uploadResult.secure_url : url.trim(),
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(",").map(t => t.trim())) : [],
      contributors: contributors ? (Array.isArray(contributors) ? contributors : contributors.split(",").map(c => c.trim())) : [],
    };

    if (folder && folder.trim()) {
      resourceData.folder = folder.trim();
    }

    if (uploadedBy && uploadedBy.trim()) {
      resourceData.uploadedBy = uploadedBy.trim();
    }

  
    if (type === "file") {
      resourceData.publicId = uploadResult.public_id;
      resourceData.format = uploadResult.format;
      resourceData.size = uploadResult.bytes;
     
    }

 
    if (type === "link") {
      resourceData.linkType = linkType && linkType.trim() ? linkType.trim() : "other";
    }

    console.log("💾 Creating resource with data:", resourceData);

    // Create the resource
    const newResource = await Resource.create(resourceData);

    console.log("✅ Resource created:", newResource._id);

    // Populate references (if they exist)
    await newResource.populate([
      { path: "department", select: "name slug icon color" },
      { path: "folder", select: "name color" },
      { path: "uploadedBy", select: "name email" }
    ]);

    res.status(201).json({
      success: true,
      message: "Resource created successfully",
      data: newResource
    });
  } catch (error) {
    console.error("❌ Error creating resource:", error);
    res.status(500).json({ 
      success: false,
      message: "Error creating resource", 
      error: error.message 
    });
  }
};


 
export const getResources = async (req, res) => {
  try {
    const { 
      department, 
      folder,
      type, 
      search, 
      tags,
      page = 1, 
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    console.log("🔍 Fetching resources with filters:", { department, folder, type, search, tags });

    const query = { isActive: true };

    if (department && department !== "all") {
      query.department = department;
    }

    if (folder && folder !== "all") {
      query.folder = folder;
    }

    if (type && type !== "all") {
      query.type = type;
    }

    if (tags) {
      const tagArray = tags.split(",").map(t => t.trim());
      query.tags = { $in: tagArray };
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query
    const resources = await Resource.find(query)
      .populate("department", "name slug")
      .populate("folder", "name color")
      .populate("uploadedBy", "name email")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Resource.countDocuments(query);

    console.log(`✅ Found ${resources.length} resources (Total: ${total})`);

    res.status(200).json({
      success: true,
      count: resources.length,
      data: resources,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("❌ Error fetching resources:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching resources",
      error: error.message 
    });
  }
};


 
export const getResourceById = async (req, res) => {
  try {
    console.log("🔍 Fetching resource:", req.params.id);

    const resource = await Resource.findById(req.params.id)
      .populate("department", "name slug")
      .populate("folder", "name color")
      .populate("uploadedBy", "name email")
      .populate("favoritedBy", "name");

    if (!resource || !resource.isActive) {
      return res.status(404).json({ 
        success: false,
        message: "Resource not found" 
      });
    }

    // Increment view count
    resource.views += 1;
    await resource.save();

    console.log("✅ Resource fetched, views:", resource.views);

    res.status(200).json({
      success: true,
      data: resource
    });
  } catch (error) {
    console.error("❌ Error fetching resource:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching resource",
      error: error.message 
    });
  }
};


export const updateResource = async (req, res) => {
  try {
    console.log("✏️ Updating resource:", req.params.id);

    const { title, description, url, linkType, tags, contributors, folder } = req.body;
    const resource = await Resource.findById(req.params.id);

    if (!resource || !resource.isActive) {
      return res.status(404).json({ 
        success: false,
        message: "Resource not found" 
      });
    }

    // If a new file is uploaded → replace old one
    if (resource.type === "file" && req.file) {
      console.log("🔄 Replacing old file with new one...");

      // Delete old Cloudinary file
      if (resource.publicId) {
        await cloudinary.uploader.destroy(resource.publicId);
        console.log("🗑️ Old file deleted from Cloudinary");
      }

      // Upload new file
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { 
              resource_type: "auto",
              folder: `gdg-resources/${resource.department}`,
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(req.file.buffer);
      });

      resource.url = uploadResult.secure_url;
      resource.publicId = uploadResult.public_id;
      resource.format = uploadResult.format;
      resource.size = uploadResult.bytes;

      console.log("✅ New file uploaded:", uploadResult.secure_url);
    }

    // Update other fields
    if (title) resource.title = title;
    if (description !== undefined) resource.description = description;
    if (url && resource.type === "link") resource.url = url;
    if (linkType) resource.linkType = linkType;
    if (folder !== undefined) resource.folder = folder || null;
    if (tags !== undefined) {
      resource.tags = Array.isArray(tags) ? tags : tags.split(",").map(t => t.trim());
    }
    if (contributors !== undefined) {
      resource.contributors = Array.isArray(contributors) ? contributors : contributors.split(",").map(c => c.trim());
    }

    await resource.save();
    await resource.populate([
      { path: "department", select: "name" },
      { path: "folder", select: "name color" },
      { path: "uploadedBy", select: "name email" }
    ]);

    console.log("✅ Resource updated successfully");

    res.status(200).json({
      success: true,
      message: "Resource updated successfully",
      data: resource
    });
  } catch (error) {
    console.error("❌ Error updating resource:", error);
    res.status(500).json({ 
      success: false,
      message: "Error updating resource",
      error: error.message 
    });
  }
};

export const deleteResource = async (req, res) => {
  try {
    console.log("🗑️ Deleting resource:", req.params.id);

    const resource = await Resource.findById(req.params.id);
    
    if (!resource || !resource.isActive) {
      return res.status(404).json({ 
        success: false,
        message: "Resource not found" 
      });
    }

    // Soft delete (just mark as inactive)
    resource.isActive = false;
    await resource.save();

    console.log("✅ Resource soft deleted (marked as inactive)");

    // Optional: Hard delete from Cloudinary (uncomment if you want)
    // if (resource.publicId) {
    //   await cloudinary.uploader.destroy(resource.publicId);
    //   console.log("🗑️ File deleted from Cloudinary");
    // }

    res.status(200).json({ 
      success: true,
      message: "Resource deleted successfully" 
    });
  } catch (error) {
    console.error("❌ Error deleting resource:", error);
    res.status(500).json({ 
      success: false,
      message: "Error deleting resource",
      error: error.message 
    });
  }
};

export const trackDownload = async (req, res) => {
  try {
    console.log("⬇️ Tracking download for:", req.params.id);

    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloads: 1 } },
      { new: true }
    );

    if (!resource) {
      return res.status(404).json({ 
        success: false,
        message: "Resource not found" 
      });
    }

    console.log("✅ Download tracked, total downloads:", resource.downloads);

    res.status(200).json({
      success: true,
      data: { downloads: resource.downloads }
    });
  } catch (error) {
    console.error("❌ Error tracking download:", error);
    res.status(500).json({ 
      success: false,
      message: "Error tracking download",
      error: error.message 
    });
  }
};


export const toggleFavorite = async (req, res) => {
  try {
    const { userId } = req.body; // Send userId from frontend

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required"
      });
    }

    console.log("⭐ Toggling favorite for resource:", req.params.id);

    const resource = await Resource.findById(req.params.id);
    
    if (!resource || !resource.isActive) {
      return res.status(404).json({ 
        success: false,
        message: "Resource not found" 
      });
    }

    const index = resource.favoritedBy.findIndex(id => id.toString() === userId);

    if (index > -1) {
      // Remove from favorites
      resource.favoritedBy.splice(index, 1);
      console.log("💔 Removed from favorites");
    } else {
      // Add to favorites
      resource.favoritedBy.push(userId);
      console.log("❤️ Added to favorites");
    }

    await resource.save();

    res.status(200).json({
      success: true,
      message: index > -1 ? "Removed from favorites" : "Added to favorites",
      data: { 
        isFavorited: index === -1,
        favoriteCount: resource.favoritedBy.length 
      }
    });
  } catch (error) {
    console.error("❌ Error toggling favorite:", error);
    res.status(500).json({ 
      success: false,
      message: "Error toggling favorite",
      error: error.message 
    });
  }
};

export const addFilesToResource = async (req, res) => {
  try {
    console.log("📎 Adding files to resource:", req.params.id);

    const resource = await Resource.findById(req.params.id);
    
    if (!resource || !resource.isActive) {
      return res.status(404).json({ 
        success: false,
        message: "Resource not found" 
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "No files uploaded" 
      });
    }

    console.log(`☁️ Uploading ${req.files.length} files to Cloudinary...`);

    const uploadPromises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { 
              resource_type: "auto",
              folder: `gdg-resources/${resource.department}`,
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(file.buffer);
      });
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    // Append new files
    resource.files = resource.files.concat(
      uploadedFiles.map((f) => ({
        url: f.secure_url,
        publicId: f.public_id,
        format: f.format,
        size: f.bytes,
      }))
    );

    await resource.save();

    console.log(`✅ ${uploadedFiles.length} files added successfully`);

    res.status(200).json({ 
      success: true,
      message: `${uploadedFiles.length} files added successfully`, 
      data: resource 
    });
  } catch (error) {
    console.error("❌ Error adding files:", error);
    res.status(500).json({ 
      success: false,
      message: "Error adding files",
      error: error.message 
    });
  }
};

export const removeFileFromResource = async (req, res) => {
  try {
    const { id, fileId } = req.params;

    console.log("🗑️ Removing file from resource:", id, "fileId:", fileId);

    const resource = await Resource.findById(id);
    
    if (!resource || !resource.isActive) {
      return res.status(404).json({ 
        success: false,
        message: "Resource not found" 
      });
    }

    const file = resource.files.find(
      (f) => f._id.toString() === fileId || f.publicId === fileId
    );

    if (!file) {
      return res.status(404).json({ 
        success: false,
        message: "File not found in this resource" 
      });
    }

    // Delete from Cloudinary
    if (file.publicId) {
      await cloudinary.uploader.destroy(file.publicId);
      console.log("🗑️ File deleted from Cloudinary");
    }

    // Remove from MongoDB
    resource.files = resource.files.filter(
      (f) => f._id.toString() !== fileId && f.publicId !== fileId
    );
    
    await resource.save();

    console.log("✅ File removed successfully");

    res.status(200).json({
      success: true,
      message: "File deleted successfully",
      data: resource,
    });
  } catch (error) {
    console.error("❌ Error removing file:", error);
    res.status(500).json({ 
      success: false,
      message: "Error removing file", 
      error: error.message 
    });
  }
};

export const getResourceStats = async (req, res) => {
  try {
    console.log("📊 Fetching resource statistics...");

    const stats = await Resource.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 },
          totalViews: { $sum: "$views" },
          totalDownloads: { $sum: "$downloads" },
          totalSize: { $sum: "$size" }
        }
      },
      {
        $lookup: {
          from: "departments",
          localField: "_id",
          foreignField: "_id",
          as: "departmentInfo"
        }
      }
    ]);

    // Overall stats
    const overall = await Resource.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalResources: { $sum: 1 },
          totalViews: { $sum: "$views" },
          totalDownloads: { $sum: "$downloads" },
          totalFiles: { $sum: { $cond: [{ $eq: ["$type", "file"] }, 1, 0] } },
          totalLinks: { $sum: { $cond: [{ $eq: ["$type", "link"] }, 1, 0] } },
        }
      }
    ]);

    console.log("✅ Statistics fetched successfully");

    res.status(200).json({
      success: true,
      data: {
        byDepartment: stats,
        overall: overall[0] || {}
      }
    });
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching statistics",
      error: error.message 
    });
  }
};
