// src/utils/helper.js
// General helper utilities for the backend

/**
 * Format API response with data and message
 * @param {*} data - Response data
 * @param {String} message - Success message
 * @returns {Object} Formatted response
 */
export const formatResponse = (data, message = "Success") => ({
  success: true,
  message,
  data,
});

/**
 * Calculate pagination metadata
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @param {Number} total - Total items
 * @returns {Object} Pagination metadata
 */
export const getPaginationMeta = (page, limit, total) => {
  const pages = Math.ceil(total / limit);
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
};

/**
 * Calculate skip value for pagination
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @returns {Number} Number of documents to skip
 */
export const getSkip = (page, limit) => {
  return (parseInt(page) - 1) * parseInt(limit);
};

/**
 * Parse and validate positive integer from query
 * @param {*} value - Value to parse
 * @param {Number} defaultValue - Default if invalid
 * @returns {Number} Parsed integer
 */
export const parsePositiveInt = (value, defaultValue = 1) => {
  const parsed = parseInt(value);
  return !isNaN(parsed) && parsed > 0 ? parsed : defaultValue;
};

/**
 * Convert milliseconds to human-readable format
 * @param {Number} ms - Milliseconds
 * @returns {String} Human-readable time
 */
export const msToTime = (ms) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

/**
 * Sanitize user input by trimming and removing dangerous characters
 * @param {String} input - User input
 * @returns {String} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input.trim().replace(/[<>]/g, "");
};

/**
 * Check if a value is a valid MongoDB ObjectId
 * @param {String} id - ID to validate
 * @returns {Boolean} True if valid ObjectId
 */
export const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Generate random string (useful for tokens, filenames)
 * @param {Number} length - Length of random string
 * @returns {String} Random string
 */
export const generateRandomString = (length = 32) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Remove undefined and null values from object
 * @param {Object} obj - Object to clean
 * @returns {Object} Cleaned object
 */
export const removeEmpty = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v != null && v !== "")
  );
};
