import { Router } from "express";
import { getAllSessions, getStats, clearSession, getHistory } from "../lib/sessionManager";

const router = Router();

/**
 * GET /api/sessions - List all active sessions (debug)
 */
router.get("/", async (_req, res) => {
  try {
    const sessions = await getAllSessions();
    const stats = await getStats();
    
    res.json({
      stats,
      sessions,
    });
  } catch (error) {
    console.error("[Sessions Route] Error:", error);
    res.status(500).json({ error: "Failed to get sessions" });
  }
});

/**
 * GET /api/sessions/:id/history - Get chat history for a session
 */
router.get("/:id/history", async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await getHistory(id);
    
    res.json({
      sessionId: id,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        available_images: m.availableImages,
        image_count: m.imageCount,
        videos: m.videos,
      })),
      count: messages.length,
    });
  } catch (error) {
    console.error("[Sessions Route] Error getting history:", error);
    res.status(500).json({ error: "Failed to get chat history" });
  }
});

/**
 * DELETE /api/sessions/:id - Clear a specific session
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await clearSession(id);
    res.json({ success: true, message: `Session ${id} cleared` });
  } catch (error) {
    console.error("[Sessions Route] Error:", error);
    res.status(500).json({ error: "Failed to clear session" });
  }
});

/**
 * DELETE /api/sessions - Clear all sessions
 */
router.delete("/", async (_req, res) => {
  try {
    const sessions = await getAllSessions();
    await Promise.all(sessions.map((s) => clearSession(s.id)));
    res.json({ success: true, message: "All sessions cleared" });
  } catch (error) {
    console.error("[Sessions Route] Error:", error);
    res.status(500).json({ error: "Failed to clear sessions" });
  }
});

export default router;
