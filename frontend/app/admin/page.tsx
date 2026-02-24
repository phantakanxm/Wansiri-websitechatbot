"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage, getFlag, getNationalityName } from "@/lib/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  Activity,
  ArrowRight,
  Stethoscope,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface DashboardStats {
  newLeadsToday: number;
  totalPatients: number;
  pendingContact: number;
  converted: number;
  nationalities: Array<{
    name: string;
    flag: string;
    count: number;
  }>;
  popularServices: Array<{
    name: string;
    count: number;
  }>;
}

interface Lead {
  id: string;
  name: string;
  nationality: string;
  preferredLanguage: string;
  status: string;
  interestedServices: string[];
  consultationStatus: string;
  priority: string;
  createdAt: string;
  contactMethods: {
    email?: string;
    phone?: string;
    line?: string;
    kakao?: string;
    whatsapp?: string;
    wechat?: string;
  };
}

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  color = "teal"
}: { 
  title: string;
  value: number;
  subtitle: string;
  icon: React.ElementType;
  trend?: number;
  color?: "teal" | "emerald" | "amber";
}) {
  const colorStyles = {
    teal: "from-[#16bec9] to-[#14a8b2] shadow-[#16bec9]/25",
    emerald: "from-emerald-500 to-emerald-600 shadow-emerald-500/25",
    amber: "from-amber-500 to-amber-600 shadow-amber-500/25",
  };

  return (
    <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</CardTitle>
        <div className={cn(
          "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
          colorStyles[color]
        )}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900 dark:text-white">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          {trend !== undefined && (
            <Badge variant={trend >= 0 ? "default" : "destructive"} className="text-[10px]">
              {trend >= 0 ? "+" : ""}{trend}%
            </Badge>
          )}
        </div>
      </CardContent>
      {/* Hover gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#16bec9]/0 to-[#14a8b2]/0 group-hover:from-[#16bec9]/5 group-hover:to-[#14a8b2]/5 transition-all duration-500" />
    </Card>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, leadsRes] = await Promise.all([
        fetch(`${API_URL}/api/dashboard/stats`),
        fetch(`${API_URL}/api/dashboard/leads?limit=5`),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }

      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setRecentLeads(leadsData.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatServiceName = (code: string) => {
    const names: Record<string, Record<string, string>> = {
      breast_augmentation: { en: "Breast Augmentation", th: "เสริมหน้าอก", ko: "가슴 성형" },
      rhinoplasty: { en: "Rhinoplasty", th: "เสริมจมูก", ko: "코 성형" },
      facelift: { en: "Facelift", th: "ดึงหน้า", ko: "안면 거상" },
      liposuction: { en: "Liposuction", th: "ดูดไขมัน", ko: "지방 흡입" },
      eyelid: { en: "Double Eyelid", th: "ตาสองชั้น", ko: "쌍꺼풀 수술" },
      other: { en: "Other", th: "อื่นๆ", ko: "기타" },
    };
    return names[code]?.[language] || code;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#16bec9]"></div>
          <div className="absolute inset-0 animate-spin rounded-full h-12 w-12 border-t-2 border-[#14a8b2]/70 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#16bec9] to-[#14a8b2] bg-clip-text text-transparent">
            {t("dashboard")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome Back! Here's What's Happening Today.
          </p>
        </div>
        <Button 
          className="bg-gradient-to-r from-[#16bec9] to-[#14a8b2] hover:from-[#14a8b2] hover:to-[#129aa3] text-white shadow-lg shadow-[#16bec9]/25"
          onClick={() => router.push('/admin/leads')}
        >
          {t("viewAllLeads")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title={t("newLeads")}
          value={stats?.newLeadsToday || 0}
          subtitle={t("todayStats")}
          icon={UserPlus}
          trend={12}
          color="teal"
        />
        <StatCard
          title="Total Leads"
          value={stats?.totalPatients || 0}
          subtitle={t("allTime")}
          icon={UserPlus}
          color="teal"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nationalities */}
        <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#16bec9] to-[#14a8b2] flex items-center justify-center">
                <Globe className="h-4 w-4 text-white" />
              </div>
              {t("byNationality")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.nationalities?.slice(0, 5).map((nat, index) => (
                <div key={nat.name} className="flex items-center gap-4 group">
                  <span className="text-2xl">{nat.flag}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{getNationalityName(nat.name)}</span>
                      <Badge 
                        variant="secondary" 
                        className="bg-[#16bec9]/10 text-[#16bec9] dark:bg-[#16bec9]/20 dark:text-[#16bec9]/70"
                      >
                        {nat.count} {t("inquiries")}
                      </Badge>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#16bec9] to-[#14a8b2] rounded-full transition-all duration-1000"
                        style={{ width: `${Math.max((nat.count / (stats.nationalities[0]?.count || 1)) * 100, 10)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Popular Services */}
        <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Activity className="h-4 w-4 text-white" />
              </div>
              {t("popularServices")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.popularServices?.slice(0, 5).map((service, index) => (
                <div key={service.name} className="flex items-center gap-4 group">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white",
                    index === 0 ? "bg-gradient-to-br from-yellow-400 to-orange-500" :
                    index === 1 ? "bg-gradient-to-br from-gray-400 to-gray-500" :
                    index === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700" :
                    "bg-gradient-to-br from-[#16bec9] to-[#14a8b2]"
                  )}>
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {formatServiceName(service.name)}
                      </span>
                      <Badge 
                        variant="secondary"
                        className="bg-[#16bec9]/10 text-[#16bec9] dark:bg-[#16bec9]/20 dark:text-[#16bec9]/70"
                      >
                        {service.count} {t("inquiries")}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads Table */}
      <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg overflow-hidden">
        <CardHeader className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Stethoscope className="h-4 w-4 text-white" />
            </div>
            {t("recentLeads")}
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-[#16bec9]/20 hover:bg-[#16bec9]/10 dark:border-slate-700 dark:hover:bg-slate-800"
            onClick={() => router.push('/admin/leads')}
          >
            {t("viewAll")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-slate-800/50">
                  <th className="text-left py-4 px-6 font-semibold text-gray-600 dark:text-gray-400">{t("name")}</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-600 dark:text-gray-400">{t("nationality")}</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-600 dark:text-gray-400">{t("interestedServices")}</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead, index) => (
                  <tr 
                    key={lead.id} 
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-[#16bec9]/5 dark:hover:bg-[#16bec9]/10 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#16bec9] to-[#14a8b2] flex items-center justify-center text-white font-medium text-sm">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{lead.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getFlag(lead.nationality)}</span>
                        <span className="text-gray-600 dark:text-gray-400">{getNationalityName(lead.nationality)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1">
                        {lead.interestedServices.slice(0, 2).map((service) => (
                          <Badge 
                            key={service} 
                            variant="outline" 
                            className="text-xs border-[#16bec9]/20 text-[#16bec9] dark:border-[#16bec9]/30 dark:text-[#16bec9]/70"
                          >
                            {formatServiceName(service)}
                          </Badge>
                        ))}
                        {lead.interestedServices.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{lead.interestedServices.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
