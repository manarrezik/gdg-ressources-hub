// src/utils/tokenGenerator.js
// JWT token generation utilities

import jwt from "jsonwebtoken";

/**
 * Generate JWT token
 * @param {String} userId - User ID to encode in token
 * @param {String} expiresIn - Token expiration (default: 7d)
 * @returns {String} JWT token
 */
export const generateToken = (userId, expiresIn = "7d") => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: expiresIn || process.env.JWT_EXPIRE || "7d",
  });
};

/**
 * Generate access and refresh tokens
 * @param {String} userId - User ID
 * @returns {Object} { accessToken, refreshToken }
 */
export const generateTokenPair = (userId) => {
  const accessToken = generateToken(userId, "15m"); // Short-lived access token
  const refreshToken = generateToken(userId, "30d"); // Long-lived refresh token

  return {
    accessToken,
    refreshToken,
  };
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
export const verifyToken = (token) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};
