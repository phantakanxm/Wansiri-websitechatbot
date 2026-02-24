'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Download, 
  RefreshCw, 
  MessageSquare, 
  Users, 
  Clock, 
  Database,
  AlertCircle,
  CheckCircle,
  Globe,
  TrendingUp,
  Trash2,
  ArrowLeft,
  Activity,
  Zap,
  Server
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface OverviewStats {
  totalMessages: number;
  totalSessions: number;
  messagesLastHour: number;
  messagesToday: number;
  avgResponseTime: number;
  cacheHitRate: number;
  fileSearchUsageRate: number;
  uptime: number;
}

interface LanguageStat {
  language: string;
  count: number;
  percentage: number;
}

interface TopQuestion {
  question: string;
  count: number;
  hasAnswer: boolean;
}

interface ErrorLog {
  timestamp: number;
  error: string;
  question: string;
}

type TabType = 'languages' | 'questions' | 'errors';

// Stat Card Component
function AnalyticsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  trend,
  color = "teal"
}: { 
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  color?: "teal" | "emerald" | "amber" | "rose";
}) {
  const colorStyles = {
    teal: "from-[#16bec9] to-[#14a8b2] shadow-[#16bec9]/25",
    emerald: "from-emerald-500 to-emerald-600 shadow-emerald-500/25",
    amber: "from-amber-500 to-amber-600 shadow-amber-500/25",
    rose: "from-rose-500 to-rose-600 shadow-rose-500/25",
  };

  return (
    <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
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
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
      </CardContent>
      {/* Gradient hover effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#16bec9]/0 to-[#14a8b2]/0 group-hover:from-[#16bec9]/5 group-hover:to-[#14a8b2]/5 transition-all duration-500" />
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [languages, setLanguages] = useState<LanguageStat[]>([]);
  const [topQuestions, setTopQuestions] = useState<TopQuestion[]>([]);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('languages');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, langRes, questionsRes, errorsRes] = await Promise.all([
        fetch(`${API_URL}/api/analytics/overview`),
        fetch(`${API_URL}/api/analytics/languages`),
        fetch(`${API_URL}/api/analytics/top-questions?limit=10`),
        fetch(`${API_URL}/api/analytics/errors?limit=10`),
      ]);

      const [statsData, langData, questionsData, errorsData] = await Promise.all([
        statsRes.json(),
        langRes.json(),
        questionsRes.json(),
        errorsRes.json(),
      ]);

      if (statsData.success) setStats(statsData.data);
      if (langData.success) setLanguages(langData.data);
      if (questionsData.success) setTopQuestions(questionsData.data);
      if (errorsData.success) setErrors(errorsData.data);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async (format: 'csv' | 'json') => {
    const response = await fetch(`${API_URL}/api/analytics/export/${format}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const clearData = async () => {
    if (!confirm('Are you sure you want to clear all analytics data?')) return;
    await fetch(`${API_URL}/api/analytics/clear`, { method: 'POST' });
    fetchData();
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const getLanguageFlag = (lang: string) => {
    const flags: Record<string, string> = { th: '🇹🇭', en: '🇬🇧', ko: '🇰🇷', zh: '🇨🇳' };
    return flags[lang] || '🌐';
  };

  const getLanguageName = (lang: string) => {
    const names: Record<string, string> = { th: 'Thai', en: 'English', ko: 'Korean', zh: 'Chinese' };
    return names[lang] || lang;
  };

  return (
    <div className="min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#16bec9] to-[#14a8b2] flex items-center justify-center shadow-lg shadow-[#16bec9]/25">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#16bec9] to-[#14a8b2] bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchData} 
            disabled={isLoading}
            className="border-[#16bec9]/20 hover:bg-[#16bec9]/10 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => exportData('csv')}
            className="border-[#16bec9]/20 hover:bg-[#16bec9]/10 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => exportData('json')}
            className="border-[#16bec9]/20 hover:bg-[#16bec9]/10 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <Download className="h-4 w-4 mr-2" />
            JSON
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={clearData}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnalyticsCard
          title="Total Messages"
          value={stats?.totalMessages?.toLocaleString() || 0}
          subtitle={`${stats?.messagesToday || 0} today`}
          icon={MessageSquare}
          color="teal"
        />
        <AnalyticsCard
          title="Active Sessions"
          value={stats?.totalSessions?.toLocaleString() || 0}
          subtitle={`${stats?.messagesLastHour || 0} messages last hour`}
          icon={Users}
          color="teal"
        />
        <AnalyticsCard
          title="Avg Response Time"
          value={`${stats?.avgResponseTime || 0}ms`}
          subtitle="Target: < 3000ms"
          icon={Clock}
          color="emerald"
        />
        <AnalyticsCard
          title="Cache Hit Rate"
          value={`${stats?.cacheHitRate || 0}%`}
          subtitle={`Uptime: ${stats ? formatTime(stats.uptime) : '0h 0m'}`}
          icon={Database}
          color="amber"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 bg-gradient-to-br from-[#16bec9]/10 to-[#14a8b2]/10 dark:from-[#16bec9]/5 dark:to-[#14a8b2]/5 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">File Search Usage</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats?.fileSearchUsageRate || 0}%
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-[#16bec9] flex items-center justify-center shadow-lg">
                <Server className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/5 dark:to-teal-500/5 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">System Status</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  Operational
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-violet-500/10 to-purple-500/10 dark:from-violet-500/5 dark:to-purple-500/5 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">API Health</p>
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 mt-1">
                  Excellent
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden">
        <div className="border-b border-gray-100 dark:border-gray-800">
          <nav className="flex">
            {[
              { id: 'languages', label: 'Languages', icon: Globe },
              { id: 'questions', label: 'Top Questions', icon: TrendingUp },
              { id: 'errors', label: 'Errors', icon: AlertCircle },
            ].map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all flex-1 justify-center',
                  activeTab === tab.id
                    ? 'border-[#16bec9] text-[#16bec9] dark:text-[#16bec9]/70 bg-[#16bec9]/5 dark:bg-[#16bec9]/10'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 dark:hover:bg-slate-800/50'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'languages' && (
            <div className="space-y-4">
              {languages.map((lang) => (
                <div key={lang.language} className="flex items-center gap-4 group">
                  <div className="text-3xl">{getLanguageFlag(lang.language)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {getLanguageName(lang.language)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{lang.count.toLocaleString()}</span>
                        <Badge 
                          variant="secondary"
                          className="bg-[#16bec9]/10 text-[#16bec9] dark:bg-[#16bec9]/20 dark:text-[#16bec9]/70"
                        >
                          {lang.percentage}%
                        </Badge>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#16bec9] to-[#14a8b2] rounded-full transition-all duration-1000"
                        style={{ width: `${lang.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-3">
              {topQuestions.map((q, i) => (
                <div 
                  key={i} 
                  className="flex items-start gap-4 p-4 bg-gray-50/80 dark:bg-slate-800/50 rounded-xl hover:bg-[#16bec9]/5 dark:hover:bg-[#16bec9]/10 transition-colors group"
                >
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-lg",
                    i === 0 ? "bg-gradient-to-br from-yellow-400 to-orange-500" :
                    i === 1 ? "bg-gradient-to-br from-gray-400 to-gray-500" :
                    i === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700" :
                    "bg-gradient-to-br from-[#16bec9] to-[#14a8b2]"
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-[#16bec9] dark:group-hover:text-[#16bec9]/70 transition-colors">
                      {q.question}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="bg-gray-200 dark:bg-gray-700">
                        {q.count} times
                      </Badge>
                      {q.hasAnswer ? (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 hover:bg-emerald-100">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Answered
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400 hover:bg-rose-100">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          No answer
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'errors' && (
            <div>
              {errors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center mb-4">
                    <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-lg font-medium">No Errors Found</p>
                  <p className="text-sm">Your System is Running Smoothly!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {errors.map((error, i) => (
                    <div 
                      key={i} 
                      className="p-4 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30 border border-rose-200 dark:border-rose-800 rounded-xl"
                    >
                      <div className="flex items-center gap-2 text-rose-800 dark:text-rose-400 mb-2">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">{new Date(error.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-rose-700 dark:text-rose-300 mb-1">{error.error}</p>
                      <p className="text-xs text-rose-600 dark:text-rose-400">Q: {error.question}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
