import { Router } from "express";
import multer from "multer";
import path from "path";
import {
  uploadFileToStore,
  listDocuments,
  deleteDocument,
} from "../lib/fileSearch";

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
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

// POST /api/admin/upload - Upload a file
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    // Upload to Gemini File Search Store
    const result = await uploadFileToStore(
      req.file.path,
      req.file.originalname
    );

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

    await deleteDocument(documentName);

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Delete API Error:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

export default router;
