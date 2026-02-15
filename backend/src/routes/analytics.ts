import { Router } from "express";
import {
  getOverviewStats,
  getHourlyStats,
  getLanguageStats,
  getTopQuestions,
  getRecentErrors,
  exportToCSV,
  exportToJSON,
  getFilteredAnalytics,
  clearAnalytics,
} from "../lib/analytics";
import { SupportedLanguage } from "../lib/language";

const router = Router();

/**
 * GET /api/analytics/overview - Get overview statistics
 */
router.get("/overview", async (_req, res) => {
  try {
    const data = await getOverviewStats();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[Analytics Route] Error:", error);
    res.status(500).json({ error: "Failed to get overview stats" });
  }
});

/**
 * GET /api/analytics/hourly - Get hourly message stats
 */
router.get("/hourly", async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const data = await getHourlyStats(hours);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[Analytics Route] Error:", error);
    res.status(500).json({ error: "Failed to get hourly stats" });
  }
});

/**
 * GET /api/analytics/languages - Get language distribution
 */
router.get("/languages", async (_req, res) => {
  try {
    const data = await getLanguageStats();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[Analytics Route] Error:", error);
    res.status(500).json({ error: "Failed to get language stats" });
  }
});

/**
 * GET /api/analytics/top-questions - Get most asked questions
 */
router.get("/top-questions", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await getTopQuestions(limit);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[Analytics Route] Error:", error);
    res.status(500).json({ error: "Failed to get top questions" });
  }
});

/**
 * GET /api/analytics/errors - Get recent errors
 */
router.get("/errors", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await getRecentErrors(limit);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[Analytics Route] Error:", error);
    res.status(500).json({ error: "Failed to get errors" });
  }
});

/**
 * GET /api/analytics/export/csv - Export data as CSV
 */
router.get("/export/csv", async (_req, res) => {
  try {
    const csv = await exportToCSV();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=analytics_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error("[Analytics Route] Error:", error);
    res.status(500).json({ error: "Failed to export CSV" });
  }
});

/**
 * GET /api/analytics/export/json - Export data as JSON
 */
router.get("/export/json", async (_req, res) => {
  try {
    const json = await exportToJSON();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=analytics_${Date.now()}.json`);
    res.send(json);
  } catch (error) {
    console.error("[Analytics Route] Error:", error);
    res.status(500).json({ error: "Failed to export JSON" });
  }
});

/**
 * POST /api/analytics/clear - Clear all analytics data
 */
router.post("/clear", async (_req, res) => {
  try {
    await clearAnalytics();
    res.json({
      success: true,
      message: "Analytics data cleared",
    });
  } catch (error) {
    console.error("[Analytics Route] Error:", error);
    res.status(500).json({ error: "Failed to clear analytics" });
  }
});

/**
 * GET /api/analytics/filter - Get filtered analytics
 */
router.get("/filter", (req, res) => {
  try {
    const { startTime, endTime, language } = req.query;

    const filters: any = {};
    if (startTime) filters.startTime = parseInt(startTime as string);
    if (endTime) filters.endTime = parseInt(endTime as string);
    if (language) filters.language = language as SupportedLanguage;

    res.json({
      success: true,
      data: getFilteredAnalytics(filters),
    });
  } catch (error) {
    console.error("[Analytics Route] Error:", error);
    res.status(500).json({ error: "Failed to get filtered analytics" });
  }
});

export default router;
