import mongoose from "mongoose";

/**
 * File Schema
 * Stores uploaded files and external links metadata
 */
const fileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
    },
    url: {
      type: String,
      required: [true, "File URL is required"],
    },
    publicId: {
      type: String,
      // Not required for external links
    },
    format: {
      type: String,
    },
    size: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      enum: [
        "image",
        "video",
        "pdf",
        "document",
        "spreadsheet",
        "presentation",
        "archive",
        "link",
        "other",
      ],
      default: "other",
    },
    resourceType: {
      type: String,
      enum: ["image", "video", "raw", "auto", "link"],
      default: "auto",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
fileSchema.index({ type: 1 });
fileSchema.index({ resourceType: 1 });
fileSchema.index({ createdAt: -1 });

export default mongoose.model("File", fileSchema);
