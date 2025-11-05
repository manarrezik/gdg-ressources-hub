import cloudinary from "../config/cloudinary.js";
import File from "../models/File.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

/**
 * Upload a file to Cloudinary and save metadata to database
 * @route POST /api/v1/upload/file
 * @access Private
 */
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  const fileBuffer = req.file.buffer;
  const fileType = req.file.mimetype.split("/")[1];

  // Upload to Cloudinary
  const uploadResult = await new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: "auto",
          folder: "gdg-resources",
          allowed_formats: [
            "jpg",
            "jpeg",
            "png",
            "gif",
            "pdf",
            "doc",
            "docx",
            "xls",
            "xlsx",
            "ppt",
            "pptx",
            "txt",
            "zip",
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      )
      .end(fileBuffer);
  });

  // Save file metadata to database
  const savedFile = await File.create({
    name: req.file.originalname,
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    format: uploadResult.format,
    size: uploadResult.bytes,
    type: fileType,
    resourceType: uploadResult.resource_type,
  });

  sendSuccess(res, savedFile, "File uploaded successfully", 201);
});

/**
 * Upload multiple files to Cloudinary
 * @route POST /api/v1/upload/files
 * @access Private
 */
export const uploadMultipleFiles = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error("No files uploaded");
  }

  const uploadPromises = req.files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "auto",
            folder: "gdg-resources",
            allowed_formats: [
              "jpg",
              "jpeg",
              "png",
              "gif",
              "pdf",
              "doc",
              "docx",
              "xls",
              "xlsx",
              "ppt",
              "pptx",
              "txt",
              "zip",
            ],
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                file,
                uploadResult: result,
              });
            }
          }
        )
        .end(file.buffer);
    });
  });

  const uploadResults = await Promise.all(uploadPromises);

  // Save all files to database
  const savedFiles = await File.insertMany(
    uploadResults.map(({ file, uploadResult }) => ({
      name: file.originalname,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      format: uploadResult.format,
      size: uploadResult.bytes,
      type: file.mimetype.split("/")[1],
      resourceType: uploadResult.resource_type,
    }))
  );

  sendSuccess(
    res,
    savedFiles,
    `${savedFiles.length} files uploaded successfully`,
    201
  );
});

/**
 * Add external link (Google Drive, Dropbox, etc.)
 * @route POST /api/v1/upload/link
 * @access Private
 */
export const addLink = asyncHandler(async (req, res) => {
  const { url, name, type } = req.body;

  if (!url) {
    res.status(400);
    throw new Error("URL is required");
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    res.status(400);
    throw new Error("Invalid URL format");
  }

  // Save link to database
  const savedLink = await File.create({
    name: name || url,
    url,
    type: type || "link",
    resourceType: "link",
    size: 0,
  });

  sendSuccess(res, savedLink, "Link added successfully", 201);
});

/**
 * Delete file from Cloudinary and database
 * @route DELETE /api/v1/upload/:id
 * @access Private
 */
export const deleteFile = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id);

  if (!file) {
    res.status(404);
    throw new Error("File not found");
  }

  // Delete from Cloudinary if it's not a link
  if (file.publicId && file.resourceType !== "link") {
    await cloudinary.uploader.destroy(file.publicId, {
      resource_type: file.resourceType,
    });
  }

  // Delete from database
  await file.deleteOne();

  sendSuccess(res, null, "File deleted successfully");
});

/**
 * Get file details
 * @route GET /api/v1/upload/:id
 * @access Public
 */
export const getFile = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id);

  if (!file) {
    res.status(404);
    throw new Error("File not found");
  }

  sendSuccess(res, file, "File retrieved successfully");
});

/**
 * Get all files with pagination
 * @route GET /api/v1/upload
 * @access Public
 */
export const getAllFiles = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build filter
  const filter = {};
  if (req.query.type) {
    filter.type = req.query.type;
  }
  if (req.query.resourceType) {
    filter.resourceType = req.query.resourceType;
  }

  const files = await File.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await File.countDocuments(filter);

  res.status(200).json({
    success: true,
    message: "Files retrieved successfully",
    data: files,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Get upload statistics
 * @route GET /api/v1/upload/stats
 * @access Private (Admin)
 */
export const getUploadStats = asyncHandler(async (req, res) => {
  const stats = await File.aggregate([
    {
      $group: {
        _id: "$resourceType",
        count: { $sum: 1 },
        totalSize: { $sum: "$size" },
      },
    },
    {
      $project: {
        _id: 0,
        type: "$_id",
        count: 1,
        totalSize: 1,
        averageSize: { $divide: ["$totalSize", "$count"] },
      },
    },
  ]);

  const totalFiles = await File.countDocuments();
  const totalSize = await File.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: "$size" },
      },
    },
  ]);

  sendSuccess(
    res,
    {
      totalFiles,
      totalSize: totalSize[0]?.total || 0,
      byType: stats,
    },
    "Upload statistics retrieved successfully"
  );
});
