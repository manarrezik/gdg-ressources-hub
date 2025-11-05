import User from "../models/User.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { generateToken } from "../utils/tokenGenerator.js";

/**
 * @route POST /api/v1/auth/register
 * @desc Register new user (default role = visitor)
 * @access Public
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, department } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email, and password are required");
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(400);
    throw new Error("User with this email already exists");
  }

  // Default role: visitor (self-registration)
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    password,
    role: "visitor",
    department: department || null,
  });

  user.lastLogin = new Date();
  await user.save();

  // Generate token including role
  const token = generateToken(user._id, user.role);

  res.status(201).json({
    success: true,
    message: "User registered successfully as a Visitor",
    data: {
      user: await User.findById(user._id).select("-password"),
      token,
    },
  });
});

/**
 * @route POST /api/v1/auth/login
 * @desc Login user (returns token with role)
 * @access Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  user.lastLogin = new Date();
  await user.save();

  // Generate token including role
  const token = generateToken(user._id, user.role);

  const userSafe = await User.findById(user._id).select("-password");

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: { user: userSafe, token },
  });
});

/**
 * @route GET /api/v1/auth/me
 * @desc Get current logged-in user
 * @access Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-password")
    .populate("department", "name slug");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});
