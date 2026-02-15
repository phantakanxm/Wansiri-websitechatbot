import { Router } from "express";
import {
  generateChatResponseEnhanced,
  verifyDocumentsReady,
} from "../lib/fileSearchEnhanced";

const router = Router();

/**
 * POST /api/chat/test - Test endpoint with detailed debugging
 * Body: { "message": "your question" }
 */
router.post("/test", async (req, res) => {
  try {
    const { message } = req.body;
    console.log("[Test API] Received:", message);

    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    // First verify documents
    const docStatus = await verifyDocumentsReady();
    console.log("[Test API] Documents ready:", docStatus);

    // Generate response with enhanced logging
    const result = await generateChatResponseEnhanced(message);

    res.json({
      response: result.text,
      debug: {
        documentsInStore: docStatus.count,
        fileSearchUsed: result.usedFileSearch,
        chunksRetrieved: result.chunks.length,
        retrievalQueries: result.retrievalQueries,
        chunks: result.chunks.map((c: any) => ({
          source: c.retrievedContext?.title || "Unknown",
          preview:
            c.retrievedContext?.text?.substring(0, 200) + "..." || "N/A",
        })),
      },
    });
  } catch (error) {
    console.error("[Test API] Error:", error);
    res.status(500).json({
      error: "Test failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/chat/health - Check if documents are ready
 */
router.get("/health", async (_req, res) => {
  try {
    const status = await verifyDocumentsReady();
    res.json({
      status: status.ready ? "ready" : "not_ready",
      documents: status.count,
      documentList: status.documents.map((d: any) => ({
        name: d.displayName || d.name,
        state: d.state,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;
