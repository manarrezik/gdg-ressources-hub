import mongoose from "mongoose";

const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Folder name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    // Which department this folder belongs to
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
    },
    // Visual styling
    color: {
      type: String,
      default: "#3B82F6", // Default blue
    },
    icon: {
      type: String,
      default: "📁", // Default folder emoji
    },
    // Who created this folder
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Count of resources
    resourceCount: {
      type: Number,
      default: 0,
    },
    // Order/position in the list
    order: {
      type: Number,
      default: 0,
    },
    // Soft delete
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate slug from name if not provided
folderSchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

// Compound unique index: same folder name can't exist twice in same department
folderSchema.index({ name: 1, department: 1 }, { unique: true });

// Index for search
folderSchema.index({ name: "text", description: "text" });

export default mongoose.model("Folder", folderSchema);