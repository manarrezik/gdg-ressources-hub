import express from "express";
import upload from "../middleware/multer.js";
import {
  uploadFile,
  uploadMultipleFiles,
  addLink,
  deleteFile,
  getFile,
  getAllFiles,
  getUploadStats,
} from "../controllers/uploadController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validate.js";

const router = express.Router();

/**
 * @route   GET /api/v1/upload
 * @desc    Get all files with pagination and filters
 * @access  Public
 */
router.get("/", getAllFiles);

/**
 * @route   GET /api/v1/upload/stats
 * @desc    Get upload statistics (total files, size, by type)
 * @access  Private (Admin only)
 */
router.get("/stats", protect, authorize("admin", "superadmin"), getUploadStats);

/**
 * @route   GET /api/v1/upload/:id
 * @desc    Get single file details
 * @access  Public
 */
router.get("/:id", validateObjectId("id"), getFile);

/**
 * @route   POST /api/v1/upload/file
 * @desc    Upload single file to Cloudinary
 * @access  Private
 */
router.post("/file", protect, upload.single("file"), uploadFile);

/**
 * @route   POST /api/v1/upload/files
 * @desc    Upload multiple files to Cloudinary
 * @access  Private
 */
router.post("/files", protect, upload.array("files", 10), uploadMultipleFiles);

/**
 * @route   POST /api/v1/upload/link
 * @desc    Add external link (Google Drive, Dropbox, etc.)
 * @access  Private
 */
router.post("/link", protect, addLink);

/**
 * @route   DELETE /api/v1/upload/:id
 * @desc    Delete file from Cloudinary and database
 * @access  Private (Admin or file owner)
 */
router.delete("/:id", protect, validateObjectId("id"), deleteFile);

export default router;
