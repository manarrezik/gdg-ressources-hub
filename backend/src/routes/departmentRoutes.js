import express from "express";
import {
  createDepartment,
  getDepartments,
  getDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentStats,
} from "../controllers/departmentController.js";

import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================
// 🔹 Department Routes with Role-Based Access
// ==========================

// 📘 Public / Authorized: All roles can view departments
router.get("/",  getDepartments);
router.get("/:id", protect, restrictTo("visitor", "member", "co-manager"), getDepartment);
router.get("/:id/stats", protect, restrictTo("visitor", "member", "co-manager"), getDepartmentStats);

// 🏗️ Co-Manager only: Create, Update, Delete
router.post("/", protect, restrictTo("co-manager"), createDepartment);
router.put("/:id", protect, restrictTo("co-manager"), updateDepartment);
router.delete("/:id", protect, restrictTo("co-manager"), deleteDepartment);

export default router;
