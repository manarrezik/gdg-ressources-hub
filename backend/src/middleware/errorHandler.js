// src/middleware/errorHandler.js
// Centralized error handling middleware. Returns JSON error responses.

export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    // expose stack trace in development only
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
