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

import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ==============================
   🔹 Co-Manager (Full Access)
   ============================== */

// Only Co-Managers can manage users completely
router.post("/", protect, restrictTo("co-manager"), createUser);          // Create user
router.get("/", protect, restrictTo("co-manager"), getUsers);             // Get all users
router.put("/:id", protect, restrictTo("co-manager"), updateUser);        // Update user
router.put("/:id/password", protect, restrictTo("co-manager"), updatePassword);
router.delete("/:id", protect, restrictTo("co-manager"), deleteUser);     // Delete user (soft)

/* ==============================
   🔸 Restricted Access
   ============================== */

// Everyone can view their own profile OR Co-Manager can view anyone
router.get("/:id", protect, async (req, res, next) => {
  try {
    if (req.user.role === "co-manager" || req.user._id.toString() === req.params.id) {
      return getUser(req, res, next);
    }
    res.status(403).json({ success: false, message: "Access denied" });
  } catch (error) {
    next(error);
  }
});

/* ==============================
   📊 Stats and Resources
   ============================== */

// Get user stats — Co-Manager only
router.get("/:id/stats", protect, restrictTo("co-manager"), getUserStats);

// Get user resources
router.get("/:id/resources", protect, async (req, res, next) => {
  try {
    // Allow access if user is co-manager OR viewing their own resources
    if (req.user.role === "co-manager" || req.user._id.toString() === req.params.id) {
      return getUserResources(req, res, next);
    }
    res.status(403).json({ success: false, message: "Access denied" });
  } catch (error) {
    next(error);
  }
});

export default router;
