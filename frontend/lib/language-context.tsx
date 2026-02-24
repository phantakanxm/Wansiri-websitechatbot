"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type Language = "th" | "en" | "ko" | "zh";

interface Translations {
  [key: string]: {
    th: string;
    en: string;
    ko: string;
    zh: string;
  };
}

export const translations: Translations = {
  dashboard: {
    th: "แดชบอร์ด",
    en: "Dashboard",
    ko: "대시보드",
    zh: "仪表板",
  },
  leads: {
    th: "ลูกค้าใหม่",
    en: "New Leads",
    ko: "신규 문의",
    zh: "新客户",
  },
  patients: {
    th: "ลูกค้าทั้งหมด",
    en: "All Patients",
    ko: "전체 고객",
    zh: "所有客户",
  },
  services: {
    th: "บริการ",
    en: "Services",
    ko: "서비스",
    zh: "服务",
  },
  logout: {
    th: "ออกจากระบบ",
    en: "Logout",
    ko: "로그아웃",
    zh: "退出",
  },
  welcome: {
    th: "ยินดีต้อนรับ",
    en: "Welcome",
    ko: "환영합니다",
    zh: "欢迎",
  },
  todayStats: {
    th: "สถิติวันนี้",
    en: "Today's Stats",
    ko: "오늘 통계",
    zh: "今日统计",
  },
  allTime: {
    th: "ทั้งหมด",
    en: "All Time",
    ko: "전체",
    zh: "全部",
  },
  needsAttention: {
    th: "ต้องติดตาม",
    en: "Needs Attention",
    ko: "주의 필요",
    zh: "需要关注",
  },
  bookedOrCompleted: {
    th: "จองหรือเสร็จสิ้น",
    en: "Booked or Completed",
    ko: "예약 완료 또는 시술 완료",
    zh: "已预约或已完成",
  },
  viewAllLeads: {
    th: "ดูลูกค้าใหม่ทั้งหมด",
    en: "View All Leads",
    ko: "전체 문의 보기",
    zh: "查看所有新客户",
  },
  viewAll: {
    th: "ดูทั้งหมด",
    en: "View All",
    ko: "전체 보기",
    zh: "查看全部",
  },
  recentLeads: {
    th: "ลูกค้าใหม่ล่าสุด",
    en: "Recent Leads",
    ko: "최근 문의",
    zh: "最近的新客户",
  },
  total: {
    th: "รายการ",
    en: "items",
    ko: "건",
    zh: "项目",
  },
  searchByName: {
    th: "ค้นหาตามชื่อ",
    en: "Search by name",
    ko: "이름으로 검색",
    zh: "按名称搜索",
  },
  filterByStatus: {
    th: "กรองตามสถานะ",
    en: "Filter by status",
    ko: "상태별 필터",
    zh: "按状态筛选",
  },
  filterByNationality: {
    th: "กรองตามสัญชาติ",
    en: "Filter by nationality",
    ko: "국적별 필터",
    zh: "按国籍筛选",
  },
  allStatuses: {
    th: "ทุกสถานะ",
    en: "All Statuses",
    ko: "전체 상태",
    zh: "所有状态",
  },
  allNationalities: {
    th: "ทุกสัญชาติ",
    en: "All Nationalities",
    ko: "전체 국적",
    zh: "所有国籍",
  },
  new: {
    th: "ใหม่",
    en: "New",
    ko: "신규",
    zh: "新",
  },
  contacted: {
    th: "ติดต่อแล้ว",
    en: "Contacted",
    ko: "연락 완료",
    zh: "已联系",
  },
  quoted: {
    th: "เสนอราคา",
    en: "Quoted",
    ko: "견적 완료",
    zh: "已报价",
  },
  booked: {
    th: "จองแล้ว",
    en: "Booked",
    ko: "예약 완료",
    zh: "已预约",
  },
  comingSoon: {
    th: "กำลังพัฒนา...",
    en: "Coming Soon...",
    ko: "준비 중...",
    zh: "即将推出...",
  },
  documents: {
    th: "จัดการเอกสาร",
    en: "Documents",
    ko: "문서 관리",
    zh: "文档管理",
  },
  serviceCatalog: {
    th: "รายการบริการ",
    en: "Service Catalog",
    ko: "서비스 목록",
    zh: "服务目录",
  },
  uploadDocument: {
    th: "อัปโหลดเอกสาร",
    en: "Upload Document",
    ko: "문서 업로드",
    zh: "上传文档",
  },
  documentList: {
    th: "รายการเอกสาร",
    en: "Document List",
    ko: "문서 목록",
    zh: "文档列表",
  },
  upload: {
    th: "อัปโหลด",
    en: "Upload",
    ko: "업로드",
    zh: "上传",
  },
  uploading: {
    th: "กำลังอัปโหลด",
    en: "Uploading",
    ko: "업로드 중",
    zh: "上传中",
  },
  refresh: {
    th: "รีเฟรช",
    en: "Refresh",
    ko: "새로고침",
    zh: "刷新",
  },
  fileName: {
    th: "ชื่อไฟล์",
    en: "File Name",
    ko: "파일명",
    zh: "文件名",
  },
  files: {
    th: "ไฟล์",
    en: "files",
    ko: "파일",
    zh: "文件",
  },
  active: {
    th: "ใช้งานได้",
    en: "Active",
    ko: "활성",
    zh: "活跃",
  },
  uploadedAt: {
    th: "อัปโหลดเมื่อ",
    en: "Uploaded At",
    ko: "업로드 시간",
    zh: "上传时间",
  },
  noDocuments: {
    th: "ไม่มีเอกสาร",
    en: "No documents",
    ko: "문서가 없습니다",
    zh: "没有文档",
  },
  supportedFormats: {
    th: "รองรับไฟล์",
    en: "Supported formats",
    ko: "지원 형식",
    zh: "支持格式",
  },
  maxSize: {
    th: "ขนาดสูงสุด",
    en: "Max size",
    ko: "최대 크기",
    zh: "最大大小",
  },
  confirmDelete: {
    th: "ยืนยันการลบ",
    en: "Confirm Delete",
    ko: "삭제 확인",
    zh: "确认删除",
  },
  deleteWarning: {
    th: "คุณแน่ใจหรือไม่ว่าต้องการลบเอกสารนี้?",
    en: "Are you sure you want to delete this document?",
    ko: "이 문서를 삭제하시겠습니까?",
    zh: "确定要删除此文档吗？",
  },
  delete: {
    th: "ลบ",
    en: "Delete",
    ko: "삭제",
    zh: "删除",
  },
  cancel: {
    th: "ยกเลิก",
    en: "Cancel",
    ko: "취소",
    zh: "取消",
  },
  uploadSuccess: {
    th: "อัปโหลดสำเร็จ",
    en: "Upload successful",
    ko: "업로드 성공",
    zh: "上传成功",
  },
  uploadError: {
    th: "อัปโหลดล้มเหลว",
    en: "Upload failed",
    ko: "업로드 실패",
    zh: "上传失败",
  },
  deleteSuccess: {
    th: "ลบสำเร็จ",
    en: "Delete successful",
    ko: "삭제 성공",
    zh: "删除成功",
  },
  deleteError: {
    th: "ลบล้มเหลว",
    en: "Delete failed",
    ko: "삭제 실패",
    zh: "删除失败",
  },
  fetchError: {
    th: "โหลดข้อมูลล้มเหลว",
    en: "Failed to load data",
    ko: "데이터 로드 실패",
    zh: "加载数据失败",
  },
  invalidFileType: {
    th: "ไฟล์ไม่รองรับ กรุณาใช้ PDF, TXT หรือ MD",
    en: "Invalid file type. Please use PDF, TXT, or MD",
    ko: "잘못된 파일 형식입니다. PDF, TXT, MD를 사용하세요",
    zh: "文件类型无效。请使用PDF、TXT或MD",
  },
  fileTooLarge: {
    th: "ไฟล์ใหญ่เกินไป (สูงสุด 10MB)",
    en: "File too large (max 10MB)",
    ko: "파일이 너무 큽니다 (최대 10MB)",
    zh: "文件太大（最大10MB）",
  },
  newLeads: {
    th: "ลูกค้าใหม่",
    en: "New Leads",
    ko: "신규 문의",
    zh: "新客户",
  },
  totalPatients: {
    th: "ลูกค้าทั้งหมด",
    en: "Total Patients",
    ko: "전체 고객",
    zh: "总客户数",
  },
  pendingContact: {
    th: "รอติดต่อ",
    en: "Pending Contact",
    ko: "연락 대기",
    zh: "待联系",
  },
  converted: {
    th: "สำเร็จ",
    en: "Converted",
    ko: "전환 완료",
    zh: "已转化",
  },
  byNationality: {
    th: "แยกตามสัญชาติ",
    en: "By Nationality",
    ko: "국적별",
    zh: "按国籍",
  },
  popularServices: {
    th: "บริการยอดนิยม",
    en: "Popular Services",
    ko: "인기 서비스",
    zh: "热门服务",
  },
  recentActivities: {
    th: "กิจกรรมล่าสุด",
    en: "Recent Activities",
    ko: "최근 활동",
    zh: "最近活动",
  },
  name: {
    th: "ชื่อ",
    en: "Name",
    ko: "이름",
    zh: "姓名",
  },
  nationality: {
    th: "สัญชาติ",
    en: "Nationality",
    ko: "국적",
    zh: "国籍",
  },
  status: {
    th: "สถานะ",
    en: "Status",
    ko: "상태",
    zh: "状态",
  },
  interestedServices: {
    th: "บริการที่สนใจ",
    en: "Interested Services",
    ko: "관심 서비스",
    zh: "感兴趣的服务",
  },
  actions: {
    th: "จัดการ",
    en: "Actions",
    ko: "관리",
    zh: "操作",
  },
  view: {
    th: "ดู",
    en: "View",
    ko: "보기",
    zh: "查看",
  },
  contact: {
    th: "ติดต่อ",
    en: "Contact",
    ko: "연락하기",
    zh: "联系",
  },
  markAsContacted: {
    th: "ทำเครื่องหมายว่าติดต่อแล้ว",
    en: "Mark as Contacted",
    ko: "연락 완료 표시",
    zh: "标记为已联系",
  },
  login: {
    th: "เข้าสู่ระบบ",
    en: "Login",
    ko: "로그인",
    zh: "登录",
  },
  username: {
    th: "ชื่อผู้ใช้",
    en: "Username",
    ko: "사용자 이름",
    zh: "用户名",
  },
  password: {
    th: "รหัสผ่าน",
    en: "Password",
    ko: "비밀번호",
    zh: "密码",
  },
  welcomeBack: {
    th: "ยินดีต้อนรับกลับ",
    en: "Welcome Back",
    ko: "다시 환영합니다",
    zh: "欢迎回来",
  },
  enterCredentials: {
    th: "กรุณากรอกข้อมูลเพื่อเข้าสู่ระบบ",
    en: "Please enter your credentials",
    ko: "로그인 정보를 입력하세요",
    zh: "请输入您的凭据",
  },
  loginError: {
    th: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
    en: "Invalid username or password",
    ko: "아이디 또는 비밀번호가 잘못되었습니다",
    zh: "用户名或密码无效",
  },
  inquiries: {
    th: "ครั้ง",
    en: "Inquiries",
    ko: "건",
    zh: "查询",
  },
  images: {
    th: "รูปภาพ",
    en: "Images",
    ko: "이미지",
    zh: "图片",
  },
  analytics: {
    th: "วิเคราะห์",
    en: "Analytics",
    ko: "분석",
    zh: "分析",
  },
  chooseFile: {
    th: "เลือกไฟล์",
    en: "Choose File",
    ko: "파일 선택",
    zh: "选择文件",
  },
  remove: {
    th: "ลบ",
    en: "Remove",
    ko: "제거",
    zh: "删除",
  },
  viewDetails: {
    th: "ดูรายละเอียด",
    en: "View Details",
    ko: "상세 보기",
    zh: "查看详情",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}

export const flagMap: Record<string, string> = {
  korea: "🇰🇷",
  korean: "🇰🇷",
  usa: "🇺🇸",
  american: "🇺🇸",
  china: "🇨🇳",
  chinese: "🇨🇳",
  japan: "🇯🇵",
  japanese: "🇯🇵",
  thailand: "🇹🇭",
  thai: "🇹🇭",
  other: "🌏",
  unknown: "❓",
};

// Nationality name mapping to English display names
export const nationalityNameMap: Record<string, string> = {
  korea: "Korea",
  korean: "Korea",
  usa: "USA",
  american: "USA",
  china: "China",
  chinese: "China",
  japan: "Japan",
  japanese: "Japan",
  thailand: "Thailand",
  thai: "Thailand",
  english: "UK/English",
  uk: "UK/English",
  british: "UK/English",
  other: "Other",
  unknown: "Unknown",
};

export function getFlag(nationality: string): string {
  return flagMap[nationality?.toLowerCase()] || "🌏";
}

export function getNationalityName(nationality: string): string {
  return nationalityNameMap[nationality?.toLowerCase()] || nationality || "Unknown";
}
