// src/controllers/userController.js
// User management controller with best practices
// - Uses asyncHandler to eliminate try-catch boilerplate
// - Consistent error handling with proper HTTP status codes
// - Input validation and sanitization
// - Proper async/await patterns

import User from "../models/User.js";
import Resource from "../models/Resource.js";
import mongoose from "mongoose";
import asyncHandler from "../middleware/asyncHandler.js";

// ============================================
// @desc    Create a new user (register)
// @route   POST /api/users
// @access  Public
// ============================================
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, department, phone, bio } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    res.status(400);
    throw new Error("User with this email already exists");
  }

  // Create user (password will be hashed automatically by pre-save hook)
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    password,
    role: role || "member",
    department: department || null,
    phone: phone || "",
    bio: bio || "",
  });

  // Populate department info for response
  await user.populate("department", "name slug icon color");

  res.status(201).json({
    success: true,
    message: "User created successfully",
    data: user,
  });
});

// ============================================
// @desc    Get all users with filters & pagination
// @route   GET /api/users?role=member&department=xxx&search=john&page=1&limit=20
// @access  Private
// ============================================
export const getUsers = asyncHandler(async (req, res) => {
  const { role, department, search, isActive = true, page = 1, limit = 20 } = req.query;

  // Build query object dynamically
  const query = {};

  // Filter by active status
  if (isActive !== undefined) {
    query.isActive = isActive === "true" || isActive === true;
  }

  // Filter by role
  if (role && role !== "all") {
    query.role = role;
  }

  // Filter by department
  if (department && department !== "all") {
    query.department = department;
  }

  // Text search on name and email (requires text index)
  if (search) {
    query.$text = { $search: search };
  }

  // Pagination calculation
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Execute query with population, sorting, and pagination
  const users = await User.find(query)
    .populate("department", "name slug icon color")
    .select("-password") // Exclude password from results
    .sort({ createdAt: -1 }) // Newest first
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination metadata
  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// ============================================
// @desc    Get single user by ID with stats
// @route   GET /api/users/:id
// @access  Private
// ============================================
export const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find user and populate department
  const user = await User.findById(id)
    .populate("department", "name slug icon color")
    .select("-password");

  if (!user || !user.isActive) {
    res.status(404);
    throw new Error("User not found");
  }

  // Get user's resource count
  const resourceCount = await Resource.countDocuments({
    uploadedBy: id,
    isActive: true,
  });

  // Aggregate user's resource statistics
  const resourceStats = await Resource.aggregate([
    {
      $match: {
        uploadedBy: new mongoose.Types.ObjectId(id),
        isActive: true,
      },
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: "$views" },
        totalDownloads: { $sum: "$downloads" },
      },
    },
  ]);

  // Build response with user data and stats
  const userData = user.toObject();
  userData.resourcesUploaded = resourceCount;

  if (resourceStats.length > 0) {
    userData.totalViews = resourceStats[0].totalViews;
    userData.totalDownloads = resourceStats[0].totalDownloads;
  }

  res.status(200).json({
    success: true,
    data: userData,
  });
});

// ============================================
// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private
// ============================================
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, role, department, phone, bio, avatar, social } = req.body;

  const user = await User.findById(id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Check if email is being changed and if it's already taken by another user
  if (email && email.toLowerCase() !== user.email) {
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      res.status(400);
      throw new Error("Email already in use");
    }
    user.email = email.toLowerCase();
  }

  // Update fields conditionally (only if provided)
  if (name) user.name = name.trim();
  if (role) user.role = role;
  if (department !== undefined) user.department = department || null;
  if (phone !== undefined) user.phone = phone;
  if (bio !== undefined) user.bio = bio;
  if (avatar !== undefined) user.avatar = avatar;
  if (social !== undefined) user.social = social;

  // Save and populate
  await user.save();
  await user.populate("department", "name slug icon color");

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: user,
  });
});

// ============================================
// @desc    Update user password
// @route   PUT /api/users/:id/password
// @access  Private
// ============================================
export const updatePassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  // Validate input
  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error("Current password and new password are required");
  }

  if (newPassword.length < 6) {
    res.status(400);
    throw new Error("New password must be at least 6 characters");
  }

  // Get user with password field (normally excluded)
  const user = await User.findById(id).select("+password");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Verify current password using comparePassword method from User model
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }

  // Update password (will be hashed by pre-save hook)
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
});

// ============================================
// @desc    Delete user (soft delete)
// @route   DELETE /api/users/:id
// @access  Private/Admin
// ============================================
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Soft delete: set isActive to false instead of removing from DB
  user.isActive = false;
  await user.save();

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

// ============================================
// @desc    Get user statistics (detailed analytics)
// @route   GET /api/users/:id/stats
// @access  Private
// ============================================
export const getUserStats = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select("name email role");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Aggregate resource statistics for this user
  const resourceStats = await Resource.aggregate([
    {
      $match: {
        uploadedBy: new mongoose.Types.ObjectId(id),
        isActive: true,
      },
    },
    {
      $group: {
        _id: null,
        totalResources: { $sum: 1 },
        totalViews: { $sum: "$views" },
        totalDownloads: { $sum: "$downloads" },
        totalFiles: { $sum: { $cond: [{ $eq: ["$type", "file"] }, 1, 0] } },
        totalLinks: { $sum: { $cond: [{ $eq: ["$type", "link"] }, 1, 0] } },
      },
    },
  ]);

  // Resources grouped by department
  const byDepartment = await Resource.aggregate([
    {
      $match: {
        uploadedBy: new mongoose.Types.ObjectId(id),
        isActive: true,
      },
    },
    {
      $group: {
        _id: "$department",
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "departments",
        localField: "_id",
        foreignField: "_id",
        as: "departmentInfo",
      },
    },
    {
      $unwind: "$departmentInfo",
    },
    {
      $project: {
        _id: 1,
        count: 1,
        name: "$departmentInfo.name",
        slug: "$departmentInfo.slug",
      },
    },
  ]);

  // Get 5 most recent resources
  const recentResources = await Resource.find({
    uploadedBy: id,
    isActive: true,
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("department", "name slug")
    .select("title type url views downloads createdAt");

  res.status(200).json({
    success: true,
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      stats: resourceStats[0] || {
        totalResources: 0,
        totalViews: 0,
        totalDownloads: 0,
        totalFiles: 0,
        totalLinks: 0,
      },
      byDepartment,
      recentResources,
    },
  });
});

// ============================================
// @desc    Get all resources uploaded by a user
// @route   GET /api/users/:id/resources?page=1&limit=20&type=file
// @access  Private
// ============================================
export const getUserResources = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20, type } = req.query;

  // Build query
  const query = {
    uploadedBy: id,
    isActive: true,
  };

  // Filter by resource type if specified
  if (type && type !== "all") {
    query.type = type;
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const resources = await Resource.find(query)
    .populate("department", "name slug icon color")
    .populate("folder", "name color")
    .sort({ createdAt: -1 })
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
