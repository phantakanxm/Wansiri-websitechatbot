"use client";

import { useEffect, useState } from "react";
import { useLanguage, getFlag, getNationalityName } from "@/lib/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Phone, 
  Mail, 
  MessageCircle, 
  UserPlus, 
  Filter,
  ArrowRight,
  Stethoscope,
  Globe
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

export default function LeadsPage() {
  const { language, t } = useLanguage();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [nationalityFilter, setNationalityFilter] = useState("all");

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await fetch(`${API_URL}/api/dashboard/leads?limit=100`);
      if (response.ok) {
        const data = await response.json();
        setLeads(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      lead: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200",
      consultation: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200",
      booked: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200",
      completed: "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-400 border-violet-200",
      open: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200",
      contacted: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200",
    };
    return styles[status] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-gray-200";
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
      normal: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
      high: "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400",
      urgent: "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400",
    };
    return styles[priority] || styles.normal;
  };

  const getPrimaryContact = (contactMethods: Lead["contactMethods"]) => {
    if (contactMethods.line) return { type: "Line", value: contactMethods.line, icon: MessageCircle };
    if (contactMethods.kakao) return { type: "Kakao", value: contactMethods.kakao, icon: MessageCircle };
    if (contactMethods.whatsapp) return { type: "WhatsApp", value: contactMethods.whatsapp, icon: Phone };
    if (contactMethods.wechat) return { type: "WeChat", value: contactMethods.wechat, icon: MessageCircle };
    if (contactMethods.email) return { type: "Email", value: contactMethods.email, icon: Mail };
    if (contactMethods.phone) return { type: "Phone", value: contactMethods.phone, icon: Phone };
    return null;
  };

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || lead.consultationStatus === statusFilter;
    const matchesNationality = nationalityFilter === "all" || lead.nationality === nationalityFilter;
    return matchesSearch && matchesStatus && matchesNationality;
  });

  // Get unique nationalities for filter
  const nationalities = [...new Set(leads.map((l) => l.nationality))];

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#16bec9] to-[#14a8b2] bg-clip-text text-transparent">
            {t("leads")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage and Track Patient Inquiries
          </p>
        </div>
        <Badge 
          variant="secondary" 
          className="bg-[#16bec9]/20 text-[#16bec9] dark:bg-[#16bec9]/20 dark:text-[#16bec9]/70 px-4 py-2"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {filteredLeads.length} {t("total")}
        </Badge>
      </div>

      {/* Filters */}
      <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#16bec9]/70" />
                <Input
                  placeholder={t("searchByName")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-[#16bec9]/20 dark:border-slate-700 focus:ring-[#16bec9]"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] border-[#16bec9]/20 dark:border-slate-700">
                <Filter className="h-4 w-4 mr-2 text-[#16bec9]" />
                <SelectValue placeholder={t("filterByStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatuses")}</SelectItem>
                <SelectItem value="open">{t("new")}</SelectItem>
                <SelectItem value="contacted">{t("contacted")}</SelectItem>
                <SelectItem value="quoted">{t("quoted")}</SelectItem>
                <SelectItem value="booked">{t("booked")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={nationalityFilter} onValueChange={setNationalityFilter}>
              <SelectTrigger className="w-[180px] border-[#16bec9]/20 dark:border-slate-700">
                <Globe className="h-4 w-4 mr-2 text-[#16bec9]" />
                <SelectValue placeholder={t("filterByNationality")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allNationalities")}</SelectItem>
                {nationalities.map((nat) => (
                  <SelectItem key={nat} value={nat}>
                    {getFlag(nat)} {getNationalityName(nat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLeads.map((lead) => {
          const primaryContact = getPrimaryContact(lead.contactMethods);
          return (
            <Card 
              key={lead.id} 
              className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group overflow-hidden"
            >
              {/* Top gradient bar */}
              <div className="h-1 bg-gradient-to-r from-[#16bec9] to-[#14a8b2]" />
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#16bec9] to-[#14a8b2] flex items-center justify-center text-white font-medium">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-lg text-gray-900 dark:text-white">{lead.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                        <span className="text-lg">{getFlag(lead.nationality)}</span>
                        <span>{getNationalityName(lead.nationality)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className={getStatusBadge(lead.consultationStatus)}>
                    {lead.consultationStatus}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Priority */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Priority:</span>
                  <Badge className={getPriorityBadge(lead.priority)}>
                    {lead.priority}
                  </Badge>
                </div>

                {/* Services */}
                <div>
                  <p className="text-sm text-gray-500 mb-2">{t("interestedServices")}</p>
                  <div className="flex flex-wrap gap-1">
                    {lead.interestedServices.map((service) => (
                      <Badge 
                        key={service} 
                        variant="outline" 
                        className="text-xs border-[#16bec9]/20 text-[#16bec9] dark:border-[#16bec9]/30 dark:text-[#16bec9]/70"
                      >
                        {formatServiceName(service)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Contact */}
                {primaryContact && (
                  <div className="flex items-center gap-2 text-sm p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                    <primaryContact.icon className="h-4 w-4 text-[#16bec9]" />
                    <span className="text-gray-500">{primaryContact.type}:</span>
                    <span className="font-medium text-gray-900 dark:text-white truncate">{primaryContact.value}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Link href={`/admin/patients/${lead.id}`} className="flex-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full border-[#16bec9]/20 hover:bg-[#16bec9]/10 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      {t("viewDetails")}
                    </Button>
                  </Link>
                  <Button 
                    size="sm" 
                    className="flex-1 bg-gradient-to-r from-[#16bec9] to-[#14a8b2] hover:from-[#14a8b2] hover:to-[#129aa3] text-white"
                  >
                    {t("contact")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredLeads.length === 0 && (
        <div className="text-center py-12">
          <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Leads Found</h3>
          <p className="text-gray-500 mt-1">Try Adjusting Your Filters</p>
        </div>
      )}
    </div>
  );
}
