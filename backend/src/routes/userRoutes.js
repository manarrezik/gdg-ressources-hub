import express from "express";
import {
  createUser,
  getUsers,
  getUser,
  updateUser,
  updatePassword,
  deleteUser,
  getUserStats,
  getUserResources,
} from "../controllers/userController.js";

const router = express.Router();

// User CRUD
router.post("/", createUser);                    // Create user
router.get("/", getUsers);                       // Get all users
router.get("/:id", getUser);                     // Get single user
router.put("/:id", updateUser);                  // Update user
router.put("/:id/password", updatePassword);     // Update password
router.delete("/:id", deleteUser);               // Delete user (soft delete)

// User statistics and resources
router.get("/:id/stats", getUserStats);          // Get user stats
router.get("/:id/resources", getUserResources);  // Get user's resources

export default router;