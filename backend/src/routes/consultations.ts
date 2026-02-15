import { Router } from "express";
import { supabase } from "../lib/supabase";
import { isSupabaseEnabled } from "../lib/supabase";

const router = Router();

/**
 * POST /api/consultations - สร้าง consultation ใหม่
 */
router.post("/", async (req, res) => {
  try {
    if (!isSupabaseEnabled()) {
      return res.status(503).json({ error: "Database not available" });
    }

    const {
      patientId,
      serviceInterested,
      consultationType,
      bodyArea,
      desiredOutcome,
      budgetRange,
      timeline,
      staffNotes,
      priority,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: "Patient ID is required" });
    }

    const { data: consultation, error } = await supabase!
      .from("consultations")
      .insert({
        patient_id: patientId,
        service_interested: serviceInterested || [],
        consultation_type: consultationType || "chat",
        body_area: bodyArea || null,
        desired_outcome: desiredOutcome || null,
        budget_range: budgetRange || null,
        timeline: timeline || null,
        staff_notes: staffNotes || null,
        priority: priority || "normal",
        status: "open",
      })
      .select()
      .single();

    if (error) {
      console.error("[Consultations API] Error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({
      success: true,
      data: consultation,
    });
  } catch (error) {
    console.error("[Consultations API] Error:", error);
    res.status(500).json({ error: "Failed to create consultation" });
  }
});

/**
 * GET /api/consultations - ดูรายการ consultation
 */
router.get("/", async (req, res) => {
  try {
    if (!isSupabaseEnabled()) {
      return res.status(503).json({ error: "Database not available" });
    }

    const { 
      status, 
      patientId,
      priority,
      limit = 50, 
      offset = 0 
    } = req.query;

    let query = supabase!
      .from("consultations")
      .select(`
        *,
        patients(first_name, last_name, nationality, preferred_language)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      query = query.eq("status", status);
    }

    if (patientId) {
      query = query.eq("patient_id", patientId);
    }

    if (priority) {
      query = query.eq("priority", priority);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[Consultations API] Error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      data,
      total: count,
    });
  } catch (error) {
    console.error("[Consultations API] Error:", error);
    res.status(500).json({ error: "Failed to fetch consultations" });
  }
});

/**
 * GET /api/consultations/pending - ดูรายการรอติดต่อ
 */
router.get("/pending", async (req, res) => {
  try {
    if (!isSupabaseEnabled()) {
      return res.status(503).json({ error: "Database not available" });
    }

    const { limit = 20 } = req.query;

    const { data, error, count } = await supabase!
      .from("consultations")
      .select(`
        *,
        patients(first_name, last_name, nationality, preferred_language, phone, email)
      `, { count: "exact" })
      .in("status", ["open", "quoted", "considering"])
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(Number(limit));

    if (error) {
      console.error("[Consultations API] Error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      data,
      total: count,
    });
  } catch (error) {
    console.error("[Consultations API] Error:", error);
    res.status(500).json({ error: "Failed to fetch pending consultations" });
  }
});

/**
 * PUT /api/consultations/:id - อัปเดตสถานะ
 */
router.put("/:id", async (req, res) => {
  try {
    if (!isSupabaseEnabled()) {
      return res.status(503).json({ error: "Database not available" });
    }

    const { id } = req.params;
    const updateData = req.body;

    const { data: consultation, error } = await supabase!
      .from("consultations")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Consultations API] Error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      data: consultation,
    });
  } catch (error) {
    console.error("[Consultations API] Error:", error);
    res.status(500).json({ error: "Failed to update consultation" });
  }
});

/**
 * POST /api/consultations/:id/assign - มอบหมายให้พนักงาน
 */
router.post("/:id/assign", async (req, res) => {
  try {
    if (!isSupabaseEnabled()) {
      return res.status(503).json({ error: "Database not available" });
    }

    const { id } = req.params;
    const { assignedTo } = req.body;

    const { data: consultation, error } = await supabase!
      .from("consultations")
      .update({
        assigned_to: assignedTo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Consultations API] Error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      data: consultation,
    });
  } catch (error) {
    console.error("[Consultations API] Error:", error);
    res.status(500).json({ error: "Failed to assign consultation" });
  }
});

export default router;
