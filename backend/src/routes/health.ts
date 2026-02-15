import { Router } from "express";
import { ai, FILE_SEARCH_STORE_NAME } from "../lib/gemini";
import { getTranslationCacheStats } from "../lib/language";
import { getFileSearchCacheStats } from "../lib/fileSearchCache";
import { getStats as getSessionStats } from "../lib/sessionManager";
import { isSupabaseEnabled } from "../lib/supabase";

const router = Router();

/**
 * GET /health - Basic health check
 */
router.get("/", async (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: isSupabaseEnabled() ? "supabase" : "memory",
  });
});

/**
 * GET /health/detailed - Detailed health check with all services
 */
router.get("/detailed", async (_req, res) => {
  const checks = {
    server: { status: "ok", responseTime: 0 },
    gemini: { status: "unknown", responseTime: 0 },
    fileSearch: { status: "unknown", documentCount: 0 },
    cache: { status: "ok", stats: {} },
    sessions: { status: "ok", stats: {} },
    database: { status: isSupabaseEnabled() ? "ok" : "memory", type: isSupabaseEnabled() ? "supabase" : "memory" },
  };

  // Check Gemini API
  const geminiStart = Date.now();
  try {
    await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: "Hello",
    });
    checks.gemini.status = "ok";
    checks.gemini.responseTime = Date.now() - geminiStart;
  } catch (error) {
    checks.gemini.status = "error";
    checks.gemini.responseTime = Date.now() - geminiStart;
  }

  // Check File Search Store
  try {
    const response = await ai.fileSearchStores.documents.list({
      parent: FILE_SEARCH_STORE_NAME,
    });
    const documents = (response as any).pageInternal || [];
    checks.fileSearch.status = "ok";
    checks.fileSearch.documentCount = documents.length;
  } catch (error) {
    checks.fileSearch.status = "error";
  }

  // Get cache stats
  checks.cache.stats = {
    translation: getTranslationCacheStats(),
    fileSearch: getFileSearchCacheStats(),
  };

  // Get session stats (now async)
  try {
    checks.sessions.stats = await getSessionStats();
  } catch (error) {
    checks.sessions.status = "error";
    checks.sessions.stats = { error: String(error) };
  }

  // Determine overall status
  const allOk = Object.values(checks).every((check: any) =>
    check.status === "ok" || check.status === "memory"
  );

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  });
});

/**
 * GET /health/cache - All cache statistics
 */
router.get("/cache", (_req, res) => {
  res.json({
    status: "ok",
    translation: getTranslationCacheStats(),
    fileSearch: getFileSearchCacheStats(),
    database: isSupabaseEnabled() ? "supabase" : "memory",
  });
});

export default router;
