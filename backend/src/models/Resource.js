import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String },
  format: String,
  size: Number,
  uploadedAt: { type: Date, default: Date.now },
});

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    
    // Resource type
    type: {
      type: String,
      enum: ["file", "link"],
      required: true,
    },
    
    // For uploaded files
    url: {
      type: String,
      required: [true, "URL is required"],
    },
    publicId: String,
    format: String,
    size: Number,

    // For links - ONLY set for type="link"
    linkType: {
      type: String,
      enum: ["drive", "figma", "notion", "github", "other"],
      // ↓ KEY FIX: Don't include this field at all if not set
      required: false,
    },

    // Folder reference (optional)
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
    },

    // Department reference (required)
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
    },

    // User who uploaded (optional)
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      
    },

    // Contributors
    contributors: [{
      type: String,
      trim: true,
    }],

    // Tags for search
    tags: [{ 
      type: String, 
      trim: true,
      lowercase: true 
    }],

    // Analytics
    views: {
      type: Number,
      default: 0,
    },
    downloads: {
      type: Number,
      default: 0,
    },

    // Favorites
    favoritedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],

    // Multiple files per resource
    files: [fileSchema],

    // Soft delete
    isActive: {
      type: Boolean,
      default: true,
    },

    uploadedAt: { 
      type: Date, 
      default: Date.now 
    },
  },
  { 
    timestamps: true 
  }
);

// Indexes for faster search and queries
resourceSchema.index({ title: "text", description: "text", tags: "text" });
resourceSchema.index({ department: 1, folder: 1, isActive: 1 });
resourceSchema.index({ uploadedBy: 1 });
resourceSchema.index({ createdAt: -1 });
resourceSchema.index({ type: 1 });

// Virtual for favorite count
resourceSchema.virtual("favoriteCount").get(function () {
  return this.favoritedBy ? this.favoritedBy.length : 0;
});

// Ensure virtuals are included in JSON
resourceSchema.set("toJSON", { virtuals: true });
resourceSchema.set("toObject", { virtuals: true });

export default mongoose.model("Resource", resourceSchema);