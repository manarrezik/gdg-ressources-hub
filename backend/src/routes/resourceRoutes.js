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

import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================
// 🔹 Public Access (No auth required)
// ==========================

// Anyone (even not logged in) can view and download stats
router.get("/", getResources);               // View all resources (public)
router.get("/stats", getResourceStats);      // Public statistics
router.get("/:id", getResourceById);         // View single resource
router.post("/:id/download", trackDownload); // Track downloads (public)

// ==========================
// 🔸 Authenticated Access
// ==========================

// Visitors can log in but CANNOT upload/edit/delete
// Members and Co-Managers can upload their own
router.post("/", protect, restrictTo("member", "co-manager"), upload.single("file"), createResource);
router.put("/:id", protect, restrictTo("member", "co-manager"), upload.single("file"), updateResource);
router.delete("/:id", protect, restrictTo("member", "co-manager", "co-manager"), deleteResource);

// Co-Managers only: delete any resource (extra admin power)
router.delete("/:id/admin-delete", protect, restrictTo("co-manager"), deleteResource);

// File management (only for Members & Co-Managers)
router.patch("/:id/add-files", protect, restrictTo("member", "co-manager"), upload.array("files", 10), addFilesToResource);
router.delete("/:id/remove-file/:fileId", protect, restrictTo("member", "co-manager"), removeFileFromResource);

// Toggle favorites (for authenticated users)
router.post("/:id/favorite", protect, restrictTo("visitor", "member", "co-manager"), toggleFavorite);

export default router;
