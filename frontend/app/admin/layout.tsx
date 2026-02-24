"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LanguageProvider, useLanguage } from "@/lib/language-context";
import {
  LayoutDashboard,
  UserPlus,
  LogOut,
  ChevronDown,
  FileText,
  Moon,
  Sun,
  Stethoscope,
  BarChart3,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, key: "dashboard", label: "Dashboard" },
  { href: "/admin/dashboard", icon: BarChart3, key: "analytics", label: "Analytics" },
  { href: "/admin/leads", icon: UserPlus, key: "leads", label: "Leads" },
  { href: "/admin/documents", icon: FileText, key: "documents", label: "Documents" },
  { href: "/admin/images", icon: ImageIcon, key: "images", label: "Images" },
];

// Theme Toggle Component
function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-9 w-9"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const auth = localStorage.getItem("admin_auth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  // Redirect to login if not authenticated (after loading)
  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/admin/login") {
      router.push("/admin/login");
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem("admin_auth");
    setIsAuthenticated(false);
    router.push("/admin/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#16bec9]/10 to-[#14a8b2]/10 dark:from-slate-950 dark:to-slate-900">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#16bec9]"></div>
          <div className="absolute inset-0 animate-spin rounded-full h-12 w-12 border-t-2 border-[#14a8b2]/70 animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Login page doesn't need layout
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // Don't render layout if not authenticated (redirect will happen via useEffect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#16bec9]/5 to-[#14a8b2]/5 dark:from-slate-950 dark:to-slate-900 flex">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-[#16bec9]/10 dark:border-slate-800 flex flex-col transition-all duration-300 shadow-xl shadow-[#16bec9]/5",
          isSidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-[#16bec9]/10 dark:border-slate-800">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#16bec9] to-[#14a8b2] flex items-center justify-center shadow-lg shadow-[#16bec9]/25">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-gray-900 dark:text-white">Wansiri</span>
                <span className="text-xs text-[#16bec9] dark:text-[#16bec9]/70">Admin Portal</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/admin" 
              ? pathname === "/admin" || pathname === "/admin/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                  isActive
                    ? "bg-gradient-to-r from-[#16bec9] to-[#14a8b2] text-white shadow-lg shadow-[#16bec9]/25"
                    : "text-gray-600 dark:text-gray-400 hover:bg-[#16bec9]/10 dark:hover:bg-slate-800 hover:text-[#16bec9] dark:hover:text-[#16bec9]/70"
                )}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                {/* Active indicator glow */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-[#16bec9]/20 to-[#14a8b2]/20 blur-xl" />
                )}
                
                <Icon className={cn(
                  "h-5 w-5 shrink-0 relative z-10",
                  !isActive && "group-hover:scale-110 transition-transform"
                )} />
                
                {!isSidebarCollapsed && (
                  <span className="relative z-10 font-medium">{t(item.key)}</span>
                )}
                
                {/* Active dot */}
                {isActive && !isSidebarCollapsed && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-white/80" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-[#16bec9]/10 dark:border-slate-800 space-y-3">
          {/* Sidebar Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full justify-center text-gray-500 hover:text-[#16bec9]"
          >
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              isSidebarCollapsed && "rotate-90"
            )} />
            {!isSidebarCollapsed && <span className="ml-2">Collapse</span>}
          </Button>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <ThemeToggle />
            {!isSidebarCollapsed && (
              <span className="text-sm text-gray-500">Theme</span>
            )}
          </div>

          {/* Logout */}
          <Button
            variant="ghost"
            className="w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            {!isSidebarCollapsed && <span className="ml-2">{t("logout")}</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </LanguageProvider>
  );
}
