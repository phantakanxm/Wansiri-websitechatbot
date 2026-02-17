import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  uploadFileToStore,
  listDocuments,
  deleteDocument,
} from "../lib/fileSearch";
import { 
  uploadImageDirect,
  listUploadedImages,
  deleteImageById,
} from "../lib/pdfImageExtractor";

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), "uploads");
    // Create directory if not exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [".pdf", ".txt", ".md"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, TXT, and MD files are allowed"));
    }
  },
});

// Configure multer for IMAGE uploads
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), "uploads", "images");
    // Create directory if not exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per image
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPG, PNG, GIF, and WEBP images are allowed"));
    }
  },
});

// POST /api/admin/upload - Upload a file (PDF/TXT/MD for File Search only)
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    // Upload to Gemini File Search Store only
    const result = await uploadFileToStore(
      req.file.path,
      req.file.originalname
    );

    // Clean up temp file
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      // Ignore cleanup errors
    }

    res.json({
      success: true,
      message: "File uploaded successfully",
      document: result,
    });
  } catch (error) {
    console.error("Upload API Error:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// GET /api/admin/files - List all files
router.get("/files", async (req, res) => {
  try {
    const documents = await listDocuments();
    res.json({ documents });
  } catch (error) {
    console.error("List Files API Error:", error);
    res.status(500).json({ error: "Failed to list files" });
  }
});

// DELETE /api/admin/delete?docId=xxx - Delete a file
router.delete("/delete", async (req, res) => {
  try {
    const documentName = req.query.docId as string;

    if (!documentName) {
      res.status(400).json({ error: "Document ID is required" });
      return;
    }

    // Try to delete from Google File Search
    try {
      await deleteDocument(documentName);
      console.log(`[Admin Delete] Deleted from File Search: ${documentName}`);
    } catch (deleteError: any) {
      // Check if it's the "non-empty document" error
      if (deleteError?.message?.includes("Cannot delete non-empty Document") || 
          deleteError?.error?.code === 400) {
        console.warn(`[Admin Delete] Document ${documentName} is non-empty, skipping File Search delete`);
      } else {
        throw deleteError;
      }
    }

    res.json({
      success: true,
      message: "File removed from system. Note: Document may still exist in Google File Search due to API limitations.",
    });
  } catch (error) {
    console.error("Delete API Error:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// ============================================
// IMAGE UPLOAD ENDPOINTS
// ============================================

// POST /api/admin/images/upload - Upload image(s) directly
router.post("/images/upload", imageUpload.array("images", 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const category = (req.body.category as string) || "general";

    if (!files || files.length === 0) {
      res.status(400).json({ error: "No images provided" });
      return;
    }

    console.log(`[Admin Images] Uploading ${files.length} images...`);

    const results = [];
    for (const file of files) {
      const result = await uploadImageDirect(file.path, file.originalname, category);
      
      // Clean up temp file
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        // Ignore cleanup errors
      }

      results.push({
        fileName: file.originalname,
        success: result.success,
        image: result.image,
        error: result.error,
      });
    }

    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      message: `Uploaded ${successCount}/${files.length} images`,
      results,
    });
  } catch (error) {
    console.error("Image Upload API Error:", error);
    res.status(500).json({ error: "Failed to upload images" });
  }
});

// GET /api/admin/images - List all uploaded images
router.get("/images", async (req, res) => {
  try {
    const category = req.query.category as string;
    const images = await listUploadedImages(category);
    
    res.json({
      success: true,
      count: images.length,
      images: images.map(img => ({
        id: img.id,
        url: img.storageUrl,
        caption: img.caption,
        extractedText: img.extractedText,
        category: img.pdfName,
        pageNumber: img.pageNumber,
      })),
    });
  } catch (error) {
    console.error("List Images API Error:", error);
    res.status(500).json({ error: "Failed to list images" });
  }
});

// DELETE /api/admin/images/:id - Delete a specific image
router.delete("/images/:id", async (req, res) => {
  try {
    const imageId = req.params.id;
    
    if (!imageId) {
      res.status(400).json({ error: "Image ID is required" });
      return;
    }

    const success = await deleteImageById(imageId);

    if (success) {
      res.json({
        success: true,
        message: "Image deleted successfully",
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to delete image",
      });
    }
  } catch (error) {
    console.error("Delete Image API Error:", error);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

export default router;
