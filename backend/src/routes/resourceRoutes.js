import express from "express";
import upload from "../middleware/multer.js";
import {
  createResource,
  getResources,
  getResourceById,
  updateResource,
  deleteResource,
  addFilesToResource,
  removeFileFromResource,
  trackDownload,
  toggleFavorite,
  getResourceStats,
} from "../controllers/resourceController.js";

const router = express.Router();

// All routes are public (no authentication)
router.get("/", getResources);                          // Get all with filters
router.get("/stats", getResourceStats);                 // Get statistics
router.get("/:id", getResourceById);                    // Get single resource
router.post("/", upload.single("file"), createResource); // Create resource
router.put("/:id", upload.single("file"), updateResource); // Update resource
router.delete("/:id", deleteResource);                  // Delete resource
router.post("/:id/download", trackDownload);            // Track download
router.post("/:id/favorite", toggleFavorite);           // Toggle favorite

// File management
router.patch("/:id/add-files", upload.array("files", 10), addFilesToResource);
router.delete("/:id/remove-file/:fileId", removeFileFromResource);

export default router;