import asyncHandler from "./asyncHandler.js";
import { verifyToken } from "../utils/tokenGenerator.js";
import User from "../models/User.js";

/**
 * 🔒 Middleware: Protect routes (only authenticated users can access)
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, token missing");
  }

  try {
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      res.status(401);
      throw new Error("User not found");
    }

    // attach both DB user and token role (in case the role changed)
    req.user = {
      ...user.toObject(),
      role: decoded.role || user.role,
    };

    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    res.status(401);
    throw new Error("Not authorized, invalid token");
  }
});

/**
 * 🎯 Middleware: Restrict routes to specific roles
/**
 * 🎯 Middleware: Restrict routes to specific roles
 * @param {...string} allowedRoles - Roles allowed to access the route
 */
export const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Not authenticated");
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403);
      throw new Error("Forbidden: insufficient permissions");
    }

    next();
  };
};
