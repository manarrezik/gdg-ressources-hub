import express from "express";
import {
  createFolder,
  getFolders,
  getFoldersByDepartment,
  getFolder,
  updateFolder,
  deleteFolder,
  getFolderStats,
  getFolderResources,
} from "../controllers/folderController.js";

import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔹 View folders (any logged-in user: Visitor, Member, Co-Manager)
router.get("/", getFolders);
router.get("/department/:departmentId", getFoldersByDepartment);
router.get("/:id",  getFolder);

// 🔹 Create / Update / Delete folders (Co-Manager only)
router.post("/", protect, restrictTo("co-manager"), createFolder);
router.put("/:id", protect, restrictTo("co-manager"), updateFolder);
router.delete("/:id", protect, restrictTo("co-manager"), deleteFolder);

// 🔹 Folder stats & resources (all logged-in roles)
router.get("/:id/stats", protect, getFolderStats);
router.get("/:id/resources",  getFolderResources);

export default router;
