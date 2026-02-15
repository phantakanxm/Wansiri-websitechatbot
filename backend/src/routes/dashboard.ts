import { Router } from "express";
import { supabase } from "../lib/supabase";
import { isSupabaseEnabled } from "../lib/supabase";

const router = Router();

/**
 * GET /api/dashboard/stats - สถิติสำหรับ dashboard
 */
router.get("/stats", async (req, res) => {
  try {
    if (!isSupabaseEnabled()) {
      return res.status(503).json({ error: "Database not available" });
    }

    const today = new Date().toISOString().split("T")[0];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get today's new leads
    const { count: newLeadsToday } = await supabase!
      .from("patients")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneDayAgo);

    // Get total patients
    const { count: totalPatients } = await supabase!
      .from("patients")
      .select("*", { count: "exact", head: true });

    // Get pending contact
    const { count: pendingContact } = await supabase!
      .from("consultations")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "quoted"]);

    // Get converted (booked/completed)
    const { count: converted } = await supabase!
      .from("patients")
      .select("*", { count: "exact", head: true })
      .in("patient_status", ["booked", "completed"]);

    // Get nationality breakdown
    const { data: nationalityStats } = await supabase!
      .from("patients")
      .select("nationality, preferred_language")
      .order("created_at", { ascending: false })
      .limit(1000);

    const nationalityBreakdown: Record<string, { count: number; flag: string }> = {};
    const flagMap: Record<string, string> = {
      korean: "🇰🇷",
      korea: "🇰🇷",
      american: "🇺🇸",
      usa: "🇺🇸",
      chinese: "🇨🇳",
      china: "🇨🇳",
      japanese: "🇯🇵",
      japan: "🇯🇵",
      thai: "🇹🇭",
      thailand: "🇹🇭",
      other: "🌏",
      unknown: "❓",
    };

    nationalityStats?.forEach((p) => {
      const nat = p.nationality?.toLowerCase() || "unknown";
      if (!nationalityBreakdown[nat]) {
        nationalityBreakdown[nat] = { count: 0, flag: flagMap[nat] || "🌏" };
      }
      nationalityBreakdown[nat].count++;
    });

    // Sort by count
    const sortedNationalities = Object.entries(nationalityBreakdown)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    // Get popular services
    const { data: consultations } = await supabase!
      .from("consultations")
      .select("service_interested")
      .not("service_interested", "is", null);

    const serviceCounts: Record<string, number> = {};
    consultations?.forEach((c) => {
      c.service_interested?.forEach((service: string) => {
        serviceCounts[service] = (serviceCounts[service] || 0) + 1;
      });
    });

    const popularServices = Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    res.json({
      success: true,
      data: {
        newLeadsToday: newLeadsToday || 0,
        totalPatients: totalPatients || 0,
        pendingContact: pendingContact || 0,
        converted: converted || 0,
        nationalities: sortedNationalities.map(([name, data]) => ({
          name,
          flag: data.flag,
          count: data.count,
        })),
        popularServices,
      },
    });
  } catch (error) {
    console.error("[Dashboard API] Error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

/**
 * GET /api/dashboard/leads - รายชื่อลูกค้าใหม่ (สำหรับ dashboard)
 */
router.get("/leads", async (req, res) => {
  try {
    if (!isSupabaseEnabled()) {
      return res.status(503).json({ error: "Database not available" });
    }

    const { 
      status = "all",
      limit = 20,
      offset = 0 
    } = req.query;

    let query = supabase!
      .from("patients")
      .select(`
        *,
        consultations(id, service_interested, status, priority, created_at)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status !== "all") {
      query = query.eq("patient_status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[Dashboard API] Error:", error);
      return res.status(500).json({ error: error.message });
    }

    // Format data for dashboard
    const formattedData = data?.map((patient: any) => ({
      id: patient.id,
      name: `${patient.first_name} ${patient.last_name || ""}`.trim(),
      nationality: patient.nationality,
      preferredLanguage: patient.preferred_language,
      status: patient.patient_status,
      interestedServices: patient.consultations?.[0]?.service_interested || [],
      consultationStatus: patient.consultations?.[0]?.status || "none",
      priority: patient.consultations?.[0]?.priority || "normal",
      createdAt: patient.created_at,
      contactMethods: {
        email: patient.email,
        phone: patient.phone,
        line: patient.line_id,
        kakao: patient.kakao_id,
        whatsapp: patient.whatsapp_number,
        wechat: patient.wechat_id,
      },
    }));

    res.json({
      success: true,
      data: formattedData,
      total: count,
    });
  } catch (error) {
    console.error("[Dashboard API] Error:", error);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

/**
 * GET /api/dashboard/activities - กิจกรรมล่าสุด
 */
router.get("/activities", async (req, res) => {
  try {
    if (!isSupabaseEnabled()) {
      return res.status(503).json({ error: "Database not available" });
    }

    const { limit = 10 } = req.query;

    // Get recent patients
    const { data: recentPatients } = await supabase!
      .from("patients")
      .select("id, first_name, last_name, nationality, created_at")
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    // Get recent consultations
    const { data: recentConsultations } = await supabase!
      .from("consultations")
      .select("id, patient_id, status, created_at, patients(first_name, last_name)")
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    // Combine and sort
    const activities = [
      ...(recentPatients?.map((p) => ({
        type: "new_patient",
        id: p.id,
        message: `New lead: ${p.first_name} ${p.last_name || ""} from ${p.nationality}`,
        timestamp: p.created_at,
      })) || []),
      ...(recentConsultations?.map((c) => ({
        type: "consultation_update",
        id: c.id,
        message: `Consultation ${c.status}: ${c.patients?.[0]?.first_name || "Unknown"}`,
        timestamp: c.created_at,
      })) || []),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, Number(limit));

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("[Dashboard API] Error:", error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

export default router;
