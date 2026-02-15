import { Router } from "express";
import { supabase } from "../lib/supabase";
import { isSupabaseEnabled } from "../lib/supabase";

const router = Router();

/**
 * POST /api/patients - สร้างลูกค้าใหม่
 */
router.post("/", async (req, res) => {
  try {
    if (!isSupabaseEnabled()) {
      return res.status(503).json({ error: "Database not available" });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      phoneCountryCode,
      nationality,
      countryOfResidence,
      preferredLanguage,
      lineId,
      kakaoId,
      whatsappNumber,
      wechatId,
      interestedServices,
      notes,
      sessionId,
    } = req.body;

    // Validate required fields
    if (!firstName || !nationality) {
      return res.status(400).json({ 
        error: "First name and nationality are required" 
      });
    }

    // Create patient
    const { data: patient, error } = await supabase!
      .from("patients")
      .insert({
        first_name: firstName,
        last_name: lastName || null,
        email: email || null,
        phone: phone || null,
        phone_country_code: phoneCountryCode || "+66",
        nationality,
        country_of_residence: countryOfResidence || nationality,
        preferred_language: preferredLanguage || "en",
        line_id: lineId || null,
        kakao_id: kakaoId || null,
        whatsapp_number: whatsappNumber || null,
        wechat_id: wechatId || null,
        notes: notes || null,
        patient_status: "lead",
        lead_source: "website_chat",
      })
      .select()
      .single();

    if (error) {
      console.error("[Patients API] Error creating patient:", error);
      return res.status(500).json({ error: error.message });
    }

    // Link to session if provided
    if (sessionId) {
      await supabase!
        .from("sessions")
        .update({ 
          user_identifier: patient.id,
          patient_name: `${firstName} ${lastName || ""}`.trim(),
          nationality,
          preferred_language: preferredLanguage || "en",
        })
        .eq("session_key", sessionId);
    }

    // Create consultation if interested services provided
    if (interestedServices && interestedServices.length > 0) {
      await supabase!
        .from("consultations")
        .insert({
          patient_id: patient.id,
          service_interested: interestedServices,
          status: "open",
          priority: "normal",
        });
    }

    // Log communication
    await supabase!
      .from("communication_logs")
      .insert({
        patient_id: patient.id,
        channel: "chat",
        direction: "inbound",
        subject: "New lead from chat",
        content: `Interested in: ${interestedServices?.join(", ") || "General inquiry"}`,
        sent_by: "system",
      });

    res.status(201).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    console.error("[Patients API] Error:", error);
    res.status(500).json({ error: "Failed to create patient" });
  }
});

/**
 * GET /api/patients - ดูรายชื่อลูกค้าทั้งหมด
 */
router.get("/", async (req, res) => {
  try {
    if (!isSupabaseEnabled()) {
      return res.status(503).json({ error: "Database not available" });
    }

    const { 
      status, 
      nationality, 
      search,
      limit = 50, 
      offset = 0 
    } = req.query;

    let query = supabase!
      .from("patients")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      query = query.eq("patient_status", status);
    }

    if (nationality) {
      query = query.eq("nationality", nationality);
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[Patients API] Error fetching patients:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      data,
      total: count,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error("[Patients API] Error:", error);
    res.status(500).json({ error: "Failed to fetch patients" });
  }
});

/**
 * GET /api/patients/:id - ดูรายละเอียดลูกค้า
 */
router.get("/:id", async (req, res) => {
  try {
    if (!isSupabaseEnabled()) {
      return res.status(503).json({ error: "Database not available" });
    }

    const { id } = req.params;

    const { data: patient, error } = await supabase!
      .from("patients")
      .select("*, consultations(*), communication_logs(*)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Patient not found" });
      }
      throw error;
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    console.error("[Patients API] Error:", error);
    res.status(500).json({ error: "Failed to fetch patient" });
  }
});

/**
 * PUT /api/patients/:id - อัปเดตข้อมูลลูกค้า
 */
router.put("/:id", async (req, res) => {
  try {
    if (!isSupabaseEnabled()) {
      return res.status(503).json({ error: "Database not available" });
    }

    const { id } = req.params;
    const updateData = req.body;

    const { data: patient, error } = await supabase!
      .from("patients")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Patients API] Error updating patient:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    console.error("[Patients API] Error:", error);
    res.status(500).json({ error: "Failed to update patient" });
  }
});

/**
 * GET /api/patients/by-session/:sessionId - หาลูกค้าจาก session
 */
router.get("/by-session/:sessionId", async (req, res) => {
  try {
    if (!isSupabaseEnabled()) {
      return res.status(503).json({ error: "Database not available" });
    }

    const { sessionId } = req.params;

    // Get session to find patient_id
    const { data: session, error: sessionError } = await supabase!
      .from("sessions")
      .select("user_identifier, patient_name, nationality")
      .eq("session_key", sessionId)
      .single();

    if (sessionError || !session?.user_identifier) {
      return res.status(404).json({ 
        error: "No patient found for this session",
        sessionData: session 
      });
    }

    // Get patient details
    const { data: patient, error } = await supabase!
      .from("patients")
      .select("*")
      .eq("id", session.user_identifier)
      .single();

    if (error) {
      return res.status(404).json({ error: "Patient not found" });
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    console.error("[Patients API] Error:", error);
    res.status(500).json({ error: "Failed to fetch patient by session" });
  }
});

export default router;
