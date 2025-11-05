// src/controllers/resourceController.js
// Resource management controller with best practices
// - Uses asyncHandler to eliminate try-catch boilerplate
// - Cloudinary integration for file uploads
// - Proper error handling and validation

import Resource from "../models/Resource.js";
import cloudinary from "../config/cloudinary.js";
import mongoose from "mongoose";
import asyncHandler from "../middleware/asyncHandler.js";

// ============================================
// @desc    Create a new resource (file or link)
// @route   POST /api/resources
// @access  Private
// ============================================
export const createResource = asyncHandler(async (req, res) => {
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
    uploadedBy,
  } = req.body;

  // Validate required fields
  if (!title?.trim()) {
    res.status(400);
    throw new Error("Title is required");
  }

  if (!type) {
    res.status(400);
    throw new Error("Type is required (file or link)");
  }

  if (!department?.trim()) {
    res.status(400);
    throw new Error("Department is required");
  }

  let uploadResult = null;

  // Handle file upload to Cloudinary
  if (type === "file") {
    if (!req.file) {
      res.status(400);
      throw new Error("No file uploaded");
    }

    uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "auto",
            folder: `gdg-resources/${department.trim()}`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(req.file.buffer);
    });
  }

  // Validate URL for link type
  if (type === "link" && !url?.trim()) {
    res.status(400);
    throw new Error("URL is required for link type");
  }

  // Build resource data
  const resourceData = {
    title: title.trim(),
    description: description?.trim() || "",
    type,
    department: department.trim(),
    url: type === "file" ? uploadResult.secure_url : url.trim(),
    tags: tags
      ? Array.isArray(tags)
        ? tags
        : tags.split(",").map((t) => t.trim())
      : [],
    contributors: contributors
      ? Array.isArray(contributors)
        ? contributors
        : contributors.split(",").map((c) => c.trim())
      : [],
  };

  // Optional fields
  if (folder?.trim()) resourceData.folder = folder.trim();
  if (uploadedBy?.trim()) resourceData.uploadedBy = uploadedBy.trim();

  // File-specific fields
  if (type === "file") {
    resourceData.publicId = uploadResult.public_id;
    resourceData.format = uploadResult.format;
    resourceData.size = uploadResult.bytes;
  }

  // Link-specific fields
  if (type === "link") {
    resourceData.linkType = linkType?.trim() || "other";
  }

  // Create resource
  const newResource = await Resource.create(resourceData);

  // Populate references
  await newResource.populate([
    { path: "department", select: "name slug icon color" },
    { path: "folder", select: "name color" },
    { path: "uploadedBy", select: "name email" },
  ]);

  res.status(201).json({
    success: true,
    message: "Resource created successfully",
    data: newResource,
  });
});

// ============================================
// @desc    Get all resources with filters
// @route   GET /api/resources?department=xxx&type=file&search=...
// @access  Public
// ============================================
export const getResources = asyncHandler(async (req, res) => {
  const {
    department,
    folder,
    type,
    search,
    tags,
    uploadedBy,
    isActive = true,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    order = "desc",
  } = req.query;

  // Build query
  const query = {};

  if (isActive !== undefined) {
    query.isActive = isActive === "true" || isActive === true;
  }

  if (department && department !== "all") {
    query.department = department;
  }

  if (folder && folder !== "all") {
    query.folder = folder;
  }

  if (type && type !== "all") {
    query.type = type;
  }

  if (uploadedBy) {
    query.uploadedBy = uploadedBy;
  }

  if (tags) {
    query.tags = { $in: Array.isArray(tags) ? tags : tags.split(",") };
  }

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Sorting
  const sortOrder = order === "asc" ? 1 : -1;
  const sortOptions = { [sortBy]: sortOrder };

  // Execute query
  const resources = await Resource.find(query)
    .populate("department", "name slug icon color")
    .populate("folder", "name color")
    .populate("uploadedBy", "name email avatar")
    .sort(sortOptions)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Resource.countDocuments(query);

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
});

// ============================================
// @desc    Get single resource by ID
// @route   GET /api/resources/:id
// @access  Public
// ============================================
export const getResourceById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const resource = await Resource.findById(id)
    .populate("department", "name slug icon color")
    .populate("folder", "name color")
    .populate("uploadedBy", "name email avatar role")
    .populate("favoritedBy", "name email avatar");

  if (!resource || !resource.isActive) {
    res.status(404);
    throw new Error("Resource not found");
  }

  // Increment views
  resource.views += 1;
  await resource.save();

  res.status(200).json({
    success: true,
    data: resource,
  });
});

// ============================================
// @desc    Update resource
// @route   PUT /api/resources/:id
// @access  Private
// ============================================
export const updateResource = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    department,
    folder,
    url,
    linkType,
    tags,
    contributors,
  } = req.body;

  const resource = await Resource.findById(id);

  if (!resource) {
    res.status(404);
    throw new Error("Resource not found");
  }

  // Handle file replacement if new file uploaded
  if (req.file && resource.type === "file") {
    // Delete old file from Cloudinary
    if (resource.publicId) {
      await cloudinary.uploader.destroy(resource.publicId);
    }

    // Upload new file
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "auto",
            folder: `gdg-resources/${department || resource.department}`,
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
  }

  // Update fields
  if (title) resource.title = title.trim();
  if (description !== undefined) resource.description = description.trim();
  if (department) resource.department = department;
  if (folder !== undefined) resource.folder = folder || null;
  if (url && resource.type === "link") resource.url = url.trim();
  if (linkType && resource.type === "link") resource.linkType = linkType;

  if (tags !== undefined) {
    resource.tags = Array.isArray(tags)
      ? tags
      : tags.split(",").map((t) => t.trim());
  }

  if (contributors !== undefined) {
    resource.contributors = Array.isArray(contributors)
      ? contributors
      : contributors.split(",").map((c) => c.trim());
  }

  await resource.save();
  await resource.populate([
    { path: "department", select: "name slug icon color" },
    { path: "folder", select: "name color" },
    { path: "uploadedBy", select: "name email" },
  ]);

  res.status(200).json({
    success: true,
    message: "Resource updated successfully",
    data: resource,
  });
});

// ============================================
// @desc    Delete resource (soft delete)
// @route   DELETE /api/resources/:id
// @access  Private/Admin
// ============================================
export const deleteResource = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const resource = await Resource.findById(id);

  if (!resource) {
    res.status(404);
    throw new Error("Resource not found");
  }

  // Soft delete
  resource.isActive = false;
  await resource.save();

  res.status(200).json({
    success: true,
    message: "Resource deleted successfully",
  });
});

// ============================================
// @desc    Track resource download
// @route   POST /api/resources/:id/download
// @access  Public
// ============================================
export const trackDownload = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const resource = await Resource.findById(id);

  if (!resource || !resource.isActive) {
    res.status(404);
    throw new Error("Resource not found");
  }

  // Increment downloads
  resource.downloads += 1;
  await resource.save();

  res.status(200).json({
    success: true,
    message: "Download tracked",
    data: {
      downloads: resource.downloads,
      url: resource.url,
    },
  });
});

// ============================================
// @desc    Toggle favorite (add/remove)
// @route   POST /api/resources/:id/favorite
// @access  Private
// ============================================
export const toggleFavorite = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    res.status(400);
    throw new Error("User ID is required");
  }

  const resource = await Resource.findById(id);

  if (!resource || !resource.isActive) {
    res.status(404);
    throw new Error("Resource not found");
  }

  // Check if already favorited
  const isFavorited = resource.favoritedBy.some(
    (fav) => fav.toString() === userId
  );

  if (isFavorited) {
    // Remove from favorites
    resource.favoritedBy = resource.favoritedBy.filter(
      (fav) => fav.toString() !== userId
    );
  } else {
    // Add to favorites
    resource.favoritedBy.push(userId);
  }

  await resource.save();

  res.status(200).json({
    success: true,
    message: isFavorited ? "Removed from favorites" : "Added to favorites",
    data: {
      isFavorited: !isFavorited,
      favoriteCount: resource.favoritedBy.length,
    },
  });
});

// ============================================
// @desc    Add multiple files to resource
// @route   POST /api/resources/:id/files
// @access  Private
// ============================================
export const addFilesToResource = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error("No files uploaded");
  }

  const resource = await Resource.findById(id);

  if (!resource) {
    res.status(404);
    throw new Error("Resource not found");
  }

  // Upload all files to Cloudinary
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
            else
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
                format: result.format,
                size: result.bytes,
              });
          }
        )
        .end(file.buffer);
    });
  });

  const uploadedFiles = await Promise.all(uploadPromises);

  // Add to resource files array
  resource.files.push(...uploadedFiles);
  await resource.save();

  res.status(200).json({
    success: true,
    message: `${uploadedFiles.length} file(s) added successfully`,
    data: resource.files,
  });
});

// ============================================
// @desc    Remove file from resource
// @route   DELETE /api/resources/:id/files/:fileId
// @access  Private
// ============================================
export const removeFileFromResource = asyncHandler(async (req, res) => {
  const { id, fileId } = req.params;

  const resource = await Resource.findById(id);

  if (!resource) {
    res.status(404);
    throw new Error("Resource not found");
  }

  const file = resource.files.id(fileId);

  if (!file) {
    res.status(404);
    throw new Error("File not found in resource");
  }

  // Delete from Cloudinary
  if (file.publicId) {
    await cloudinary.uploader.destroy(file.publicId);
  }

  // Remove from array
  resource.files.pull(fileId);
  await resource.save();

  res.status(200).json({
    success: true,
    message: "File removed successfully",
  });
});

// ============================================
// @desc    Get resource statistics
// @route   GET /api/resources/stats
// @access  Private
// ============================================
export const getResourceStats = asyncHandler(async (req, res) => {
  // Total resources
  const totalResources = await Resource.countDocuments({ isActive: true });

  // Resources by type
  const byType = await Resource.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$type", count: { $sum: 1 } } },
  ]);

  // Resources by department
  const byDepartment = await Resource.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$department", count: { $sum: 1 } } },
    {
      $lookup: {
        from: "departments",
        localField: "_id",
        foreignField: "_id",
        as: "departmentInfo",
      },
    },
    { $unwind: "$departmentInfo" },
    {
      $project: {
        _id: 1,
        count: 1,
        name: "$departmentInfo.name",
        slug: "$departmentInfo.slug",
      },
    },
  ]);

  // Total views and downloads
  const totals = await Resource.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalViews: { $sum: "$views" },
        totalDownloads: { $sum: "$downloads" },
      },
    },
  ]);

  // Most popular resources (by views)
  const mostViewed = await Resource.find({ isActive: true })
    .sort({ views: -1 })
    .limit(5)
    .populate("department", "name slug")
    .select("title type views downloads url");

  res.status(200).json({
    success: true,
    data: {
      totalResources,
      byType,
      byDepartment,
      totalViews: totals[0]?.totalViews || 0,
      totalDownloads: totals[0]?.totalDownloads || 0,
      mostViewed,
    },
  });
});
