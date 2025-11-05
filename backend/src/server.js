// src/server.js
// Main server file with security best practices and production-ready configuration

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import hpp from "hpp";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import resourceRoutes from "./routes/resourceRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import folderRoutes from "./routes/folderRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

// ============================================
// CONFIGURATION
// ============================================

// Emulate __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

// Validate required environment variables
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is not defined in environment variables");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// ============================================
// DATABASE CONNECTION
// ============================================
connectDB();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Set security HTTP headers
app.use(helmet());

// Rate limiting - prevent brute force attacks
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use("/api", limiter);

// Prevent NoSQL injection attacks
app.use(mongoSanitize());

// Prevent XSS attacks
app.use(xss());

// Prevent HTTP parameter pollution
app.use(hpp());

// ============================================
// GENERAL MIDDLEWARE
// ============================================

// Enable CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: "10mb" })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression middleware
app.use(compression());

// Logging middleware (only in development)
if (NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  // In production, use combined format (Apache style)
  app.use(morgan("combined"));
}

// ============================================
// API ROUTES (v1)
// ============================================

app.use("/api/v1/resources", resourceRoutes);
app.use("/api/v1/departments", departmentRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/upload", uploadRoutes);

// Backwards compatibility (optional - remove after migration)
app.use("/api/resources", resourceRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/folders", folderRoutes);  


// ...
app.use("/api/v1/auth", authRoutes);

// backwards-compat optional:
app.use("/api/auth", authRoutes);


// ============================================
// HEALTH CHECK & ROOT ENDPOINTS
// ============================================

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// API info endpoint
app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    message: "GDG Resource Hub API",
    version: "1.0.0",
    endpoints: {
      resources: "/api/v1/resources",
      departments: "/api/v1/departments",
      users: "/api/v1/users",
      health: "/health",
    },
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler - must be after all routes
app.use(notFound);

// Global error handler - must be last
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   🚀 GDG Resource Hub API Server          ║
╠════════════════════════════════════════════╣
║   Environment: ${NODE_ENV.padEnd(27)}║
║   Port:        ${PORT.toString().padEnd(27)}║
║   Status:      Running ✅                  ║
╚════════════════════════════════════════════╝
  `);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION! Shutting down...");
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM (e.g., from Heroku, Docker)
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("✅ Process terminated");
  });
});

// Handle SIGINT (Ctrl+C)
process.on("SIGINT", () => {
  console.log("\n👋 SIGINT received. Shutting down gracefully...");
  server.close(() => {
    console.log("✅ Process terminated");
    process.exit(0);
  });
});

export default app;
