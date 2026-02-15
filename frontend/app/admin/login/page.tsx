"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LanguageProvider, useLanguage, translations } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Stethoscope, Lock, User } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Simple authentication (in production, use proper auth)
    if (username === "admin" && password === "wansiri2024") {
      localStorage.setItem("admin_auth", "true");
      // Use window.location for full page reload to ensure layout picks up auth state
      window.location.href = "/admin";
    } else {
      setError(t("loginError"));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#16bec9]/10 via-[#16bec9]/5 to-[#16bec9]/10 dark:from-slate-950 dark:via-[#16bec9]/10 dark:to-slate-950 p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[#16bec9]/10 to-[#14a8b2]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-[#14a8b2]/10 to-[#16bec9]/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#16bec9] to-[#14a8b2] shadow-xl shadow-[#16bec9]/25 mb-4">
            <Stethoscope className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#16bec9] to-[#14a8b2] bg-clip-text text-transparent">
            Wansiri Hospital
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Admin Portal</p>
        </div>

        <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-[#16bec9]/10">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">{t("welcomeBack")}</CardTitle>
            <CardDescription>{t("enterCredentials")}</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">
                  {t("username")}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    required
                    className="pl-10 h-12 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 focus:ring-[#16bec9] focus:border-[#16bec9]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                  {t("password")}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pl-10 h-12 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 focus:ring-[#16bec9] focus:border-[#16bec9]"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg">
                  <p className="text-rose-600 dark:text-rose-400 text-sm text-center">{error}</p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-[#16bec9] to-[#14a8b2] hover:from-[#14a8b2] hover:to-[#129aa3] text-white font-medium shadow-lg shadow-[#16bec9]/25 transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  t("login")
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <p className="text-center text-sm text-gray-500">
                <span className="font-medium">Demo:</span> admin / wansiri2024
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          © 2024 Wansiri Hospital. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <LanguageProvider>
      <LoginContent />
    </LanguageProvider>
  );
}
