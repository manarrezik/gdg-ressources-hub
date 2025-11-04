import User from "../models/User.js";
import Resource from "../models/Resource.js";
import mongoose from "mongoose";

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, department, phone, bio } = req.body;

    console.log("👤 Creating user:", email);

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Validate department if provided
    if (department && !mongoose.Types.ObjectId.isValid(department)) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: role || "member",
      department: department || null,
      phone: phone || "",
      bio: bio || "",
    });

    console.log("✅ User created:", user._id);

    // Populate department
    await user.populate("department", "name slug icon color");

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    console.error("❌ Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Error creating user",
      error: error.message,
    });
  }
};


export const getUsers = async (req, res) => {
  try {
    const { role, department, search, isActive = true, page = 1, limit = 20 } = req.query;

    console.log("🔍 Fetching users...");

    // Build query
    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === "true" || isActive === true;
    }

    if (role && role !== "all") {
      query.role = role;
    }

    if (department && department !== "all") {
      query.department = department;
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .populate("department", "name slug icon color")
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    console.log(`✅ Found ${users.length} users`);

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
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};

export const getUser = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("🔍 Fetching user:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(id)
      .populate("department", "name slug icon color")
      .select("-password");

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get user's resources count
    const resourceCount = await Resource.countDocuments({
      uploadedBy: id,
      isActive: true,
    });

    // Get user's statistics
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

    const userData = user.toObject();
    userData.resourcesUploaded = resourceCount;

    if (resourceStats.length > 0) {
      userData.totalViews = resourceStats[0].totalViews;
      userData.totalDownloads = resourceStats[0].totalDownloads;
    }

    console.log("✅ User fetched");

    res.status(200).json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, department, phone, bio, avatar, social } = req.body;

    console.log("✏️ Updating user:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email.trim().toLowerCase() !== user.email) {
      const emailExists = await User.findOne({ email: email.trim().toLowerCase() });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
      user.email = email.trim().toLowerCase();
    }

    // Update fields
    if (name) user.name = name.trim();
    if (role) user.role = role;
    if (department !== undefined) user.department = department || null;
    if (phone !== undefined) user.phone = phone;
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;
    if (social !== undefined) user.social = social;

    await user.save();
    await user.populate("department", "name slug icon color");

    console.log("✅ User updated");

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("❌ Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user",
      error: error.message,
    });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    console.log("🔑 Updating password for user:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }


    const user = await User.findById(id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

  
    user.password = newPassword;
    await user.save();

    console.log("✅ Password updated");

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating password:", error);
    res.status(500).json({
      success: false,
      message: "Error updating password",
      error: error.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("🗑️ Deleting user:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }


    user.isActive = false;
    await user.save();

    console.log("✅ User deleted (soft delete)");

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: error.message,
    });
  }
};

export const getUserStats = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("📊 Fetching stats for user:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(id).select("name email role");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    
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
    ]);

    const recentResources = await Resource.find({
      uploadedBy: id,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("department", "name slug")
      .select("title type url views downloads createdAt");

    console.log("✅ Stats fetched");

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
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user statistics",
      error: error.message,
    });
  }
};


export const getUserResources = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, type } = req.query;

    console.log("📋 Fetching resources for user:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // Build query
    const query = {
      uploadedBy: id,
      isActive: true,
    };

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

    console.log(`✅ Found ${resources.length} resources`);

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
  } catch (error) {
    console.error("❌ Error fetching user resources:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user resources",
      error: error.message,
    });
  }
};