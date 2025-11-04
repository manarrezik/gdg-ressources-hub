import express from "express";
import {
  createDepartment,
  getDepartments,
  getDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentStats,
} from "../controllers/departmentController.js";

const router = express.Router();

// Department CRUD
router.post("/", createDepartment);              // Create department
router.get("/", getDepartments);                 // Get all departments
router.get("/:id", getDepartment);               // Get single department (by ID or slug)
router.put("/:id", updateDepartment);            // Update department
router.delete("/:id", deleteDepartment);         // Delete department (soft delete)

// Statistics
router.get("/:id/stats", getDepartmentStats);    // Get department stats

export default router;