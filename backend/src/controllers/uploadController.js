// import cloudinary from "../config/cloudinary.js";
// import File from "../models/File.js";

// export const uploadFile = async (req, res) => {
//   try {
//     console.log("📁 Upload endpoint hit!");

//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "No file uploaded",
//       });
//     }

//     console.log("✅ File received:", req.file.originalname);

//     const fileBuffer = req.file.buffer;
//     const fileType = req.file.mimetype.split("/")[1];

//     console.log("☁️ Uploading to Cloudinary...");

//     const uploadResult = await new Promise((resolve, reject) => {
//       cloudinary.uploader
//         .upload_stream(
//           {
//             resource_type: "auto",
//             folder: "gdg-resources",
//           },
//           (error, result) => {
//             if (error) reject(error);
//             else resolve(result);
//           }
//         )
//         .end(fileBuffer);
//     });

//     console.log("✅ Upload successful:", uploadResult.secure_url);

//     // 🧠 Save file info in MongoDB
//     const savedFile = await File.create({
//       name: req.file.originalname,
//       url: uploadResult.secure_url,
//       publicId: uploadResult.public_id,
//       format: uploadResult.format,
//       size: uploadResult.bytes,
//       type: fileType,
//       resourceType: uploadResult.resource_type,
//     });

//     const response = {
//       success: true,
//       message: "File uploaded and saved to database",
//       data: savedFile,
//     };

//     res.status(200).json(response);
//   } catch (error) {
//     console.error("❌ Upload error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error uploading file",
//       error: error.message,
//     });
//   }
// };

// export const addLink = async (req, res) => {
//   try {
//     const { url, type } = req.body;

//     if (!url) {
//       return res.status(400).json({
//         success: false,
//         message: "URL is required",
//       });
//     }

//     // Validate URL format
//     new URL(url); // will throw if invalid

//     // For now, just return response (you can later save links too)
//     res.status(200).json({
//       success: true,
//       message: "Link added successfully",
//       data: {
//         url,
//         type: type || "other",
//       },
//     });
//   } catch (error) {
//     console.error("❌ Link error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error saving link",
//       error: error.message,
//     });
//   }
// };
