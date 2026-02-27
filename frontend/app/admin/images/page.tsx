"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  ImageIcon,
  FolderOpen,
  ZoomIn,
  RotateCcw,
  AlertTriangle,
  Trash,
  Plus,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CuteUploadLoader } from "@/components/cute-upload-loader";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Subcategory {
  id: string;
  category_id: string;
  value: string;
  label: string;
  keywords: string[];
  sort_order: number;
}

interface UploadedImage {
  id: string;
  url: string;
  caption?: string;
  extractedText?: string;
  category: string;
  subcategory?: string;
}

interface Category {
  id: string;
  value: string;
  label: string;
  icon: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export default function ImagesPage() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [trashedImages, setTrashedImages] = useState<UploadedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [category, setCategory] = useState("general");
  const [subcategory, setSubcategory] = useState<string | undefined>(undefined);
  const [availableSubcategories, setAvailableSubcategories] = useState<{ value: string; label: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "trash">("active");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<UploadedImage | null>(null);
  const [imageToRestore, setImageToRestore] = useState<UploadedImage | null>(null);
  const [previewImage, setPreviewImage] = useState<UploadedImage | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryValue, setNewCategoryValue] = useState("");
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("📁");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Subcategories state
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(false);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [newSubcategoryCategoryId, setNewSubcategoryCategoryId] = useState<string>("");
  const [newSubcategoryValue, setNewSubcategoryValue] = useState("");
  const [newSubcategoryLabel, setNewSubcategoryLabel] = useState("");
  const [newSubcategoryKeywords, setNewSubcategoryKeywords] = useState("");
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);

  // Fetch active images
  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/images`);
      if (!response.ok) throw new Error("Failed to fetch images");
      const data = await response.json();
      setImages(data.images || []);
    } catch (error) {
      console.error("Error fetching images:", error);
      showNotification("error", "ไม่สามารถโหลดรูปภาพได้");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch trashed images
  const fetchTrashedImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/images/trash`);
      if (!response.ok) throw new Error("Failed to fetch trashed images");
      const data = await response.json();
      setTrashedImages(data.images || []);
    } catch (error) {
      console.error("Error fetching trashed images:", error);
      showNotification("error", "ไม่สามารถโหลดถังขยะได้");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/categories`);
      if (!response.ok) throw new Error("Failed to fetch categories");
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      // Fallback to default categories if API fails
      setCategories([
        { id: "1", value: "srs-tec", label: "เทคนิคการผ่าตัด (Technique)", icon: "🩺", sort_order: 1, created_at: "", updated_at: "" },
        { id: "2", value: "srs-review", label: "รีวิว/ผลลัพธ์ (Review)", icon: "⭐", sort_order: 2, created_at: "", updated_at: "" },
        { id: "3", value: "srs-doctor", label: "ข้อมูลแพทย์ (Doctor)", icon: "👨‍⚕️", sort_order: 3, created_at: "", updated_at: "" },
        { id: "4", value: "srs-package", label: "แพ็คเกจ/ราคา (Package)", icon: "💰", sort_order: 4, created_at: "", updated_at: "" },
        { id: "5", value: "srs-room", label: "ห้องพัก/ห้องรับรอง (Room)", icon: "🛏️", sort_order: 5, created_at: "", updated_at: "" },
        { id: "6", value: "srs-operatingroom", label: "ห้องผ่าตัด (Operating Room)", icon: "🏥", sort_order: 6, created_at: "", updated_at: "" },
        { id: "7", value: "general", label: "ทั่วไป (General)", icon: "📁", sort_order: 7, created_at: "", updated_at: "" },
      ]);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  // Update available subcategories when category changes
  useEffect(() => {
    const fetchSubcategories = async () => {
      const selectedCategory = categories.find(c => c.value === category);
      if (selectedCategory) {
        setIsLoadingSubcategories(true);
        try {
          const response = await fetch(`${API_URL}/api/admin/subcategories?category_id=${selectedCategory.id}`);
          if (response.ok) {
            const data = await response.json();
            setSubcategories(data.subcategories || []);
            setAvailableSubcategories(
              (data.subcategories || []).map((s: Subcategory) => ({ value: s.value, label: s.label }))
            );
          } else {
            setAvailableSubcategories([]);
            setSubcategories([]);
          }
        } catch (error) {
          console.error("Error fetching subcategories:", error);
          setAvailableSubcategories([]);
          setSubcategories([]);
        } finally {
          setIsLoadingSubcategories(false);
        }
      } else {
        setAvailableSubcategories([]);
        setSubcategories([]);
      }
      setSubcategory(undefined); // Reset subcategory when category changes
    };

    fetchSubcategories();
  }, [category, categories]);

  // Create new subcategory
  const handleCreateSubcategory = async () => {
    if (!newSubcategoryValue.trim() || !newSubcategoryLabel.trim()) {
      showNotification("error", "กรุณากรอกชื่อและ Label ของหมวดหมู่ย่อย");
      return;
    }

    if (!newSubcategoryCategoryId) {
      showNotification("error", "กรุณาเลือกหมวดหมู่หลัก");
      return;
    }

    setIsCreatingSubcategory(true);
    try {
      const keywords = newSubcategoryKeywords.split(",").map(k => k.trim()).filter(k => k);
      const response = await fetch(`${API_URL}/api/admin/subcategories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: newSubcategoryCategoryId,
          value: newSubcategoryValue,
          label: newSubcategoryLabel,
          keywords,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showNotification("success", "สร้างหมวดหมู่ย่อยสำเร็จ");
        setSubcategoryDialogOpen(false);
        setNewSubcategoryCategoryId("");
        setNewSubcategoryValue("");
        setNewSubcategoryLabel("");
        setNewSubcategoryKeywords("");
        // Refresh subcategories for current category
        const selectedCategory = categories.find(c => c.value === category);
        if (selectedCategory) {
          const refreshResponse = await fetch(`${API_URL}/api/admin/subcategories?category_id=${selectedCategory.id}`);
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            setSubcategories(refreshData.subcategories || []);
            setAvailableSubcategories(
              (refreshData.subcategories || []).map((s: Subcategory) => ({ value: s.value, label: s.label }))
            );
          }
        }
      } else {
        showNotification("error", data.error || "สร้างหมวดหมู่ย่อยไม่สำเร็จ");
      }
    } catch (error) {
      console.error("Error creating subcategory:", error);
      showNotification("error", "สร้างหมวดหมู่ย่อยไม่สำเร็จ");
    } finally {
      setIsCreatingSubcategory(false);
    }
  };

  // Create new category
  const handleCreateCategory = async () => {
    if (!newCategoryValue.trim() || !newCategoryLabel.trim()) {
      showNotification("error", "กรุณากรอกชื่อและ Label ของหมวดหมู่");
      return;
    }

    setIsCreatingCategory(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: newCategoryValue,
          label: newCategoryLabel,
          icon: newCategoryIcon,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showNotification("success", "สร้างหมวดหมู่สำเร็จ");
        setCategoryDialogOpen(false);
        setNewCategoryValue("");
        setNewCategoryLabel("");
        setNewCategoryIcon("📁");
        await fetchCategories();
      } else {
        showNotification("error", data.error || "สร้างหมวดหมู่ไม่สำเร็จ");
      }
    } catch (error) {
      console.error("Error creating category:", error);
      showNotification("error", "สร้างหมวดหมู่ไม่สำเร็จ");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Get category display label
  const getCategoryLabel = (value: string): string => {
    const cat = categories.find(c => c.value === value);
    return cat ? `${cat.icon} ${cat.label} (${cat.value})` : value;
  };

  // Get category badge display
  const getCategoryBadge = (value: string): { icon: string; label: string; value: string } => {
    const cat = categories.find(c => c.value === value);
    return cat 
      ? { icon: cat.icon, label: cat.label, value: cat.value }
      : { icon: "📁", label: value, value };
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (activeTab === "active") {
      fetchImages();
    } else {
      fetchTrashedImages();
    }
  }, [activeTab, fetchImages, fetchTrashedImages]);

  // Show notification
  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Handle file validation and selection
  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;

    const allowedTypes = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const invalidFiles = files.filter(file => {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      return !allowedTypes.includes(ext);
    });

    if (invalidFiles.length > 0) {
      showNotification("error", "รองรับเฉพาะไฟล์ JPG, PNG, GIF, WEBP เท่านั้น");
      return;
    }

    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      showNotification("error", "ไฟล์ต้องมีขนาดไม่เกิน 10MB ต่อรูป");
      return;
    }

    setSelectedFiles(files);
  };

  // Handle file selection from input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  // Handle upload
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append("images", file);
    });
    formData.append("category", category);
    if (subcategory) {
      formData.append("subcategory", subcategory);
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/images/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      const successCount = data.results.filter((r: any) => r.success).length;
      
      showNotification("success", `อัปโหลดสำเร็จ ${successCount}/${selectedFiles.length} รูป`);
      setSelectedFiles([]);
      setSubcategory(undefined);
      fetchImages();
    } catch (error) {
      console.error("Upload error:", error);
      showNotification("error", "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle soft delete (move to trash)
  const handleDelete = async () => {
    if (!imageToDelete) return;

    try {
      const response = await fetch(
        `${API_URL}/api/admin/images/${imageToDelete.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Delete failed");

      showNotification("success", "ย้ายรูปไปถังขยะแล้ว");
      fetchImages();
    } catch (error) {
      console.error("Delete error:", error);
      showNotification("error", "ย้ายรูปไม่สำเร็จ");
    } finally {
      setDeleteDialogOpen(false);
      setImageToDelete(null);
    }
  };

  // Handle restore from trash
  const handleRestore = async (image: UploadedImage) => {
    try {
      const response = await fetch(
        `${API_URL}/api/admin/images/${image.id}/restore`,
        { method: "POST" }
      );

      if (!response.ok) throw new Error("Restore failed");

      showNotification("success", "กู้คืนรูปภาพสำเร็จ");
      fetchTrashedImages();
    } catch (error) {
      console.error("Restore error:", error);
      showNotification("error", "กู้คืนรูปไม่สำเร็จ");
    }
  };

  // Handle permanent delete
  const handlePermanentDelete = async () => {
    if (!imageToDelete) return;

    try {
      const response = await fetch(
        `${API_URL}/api/admin/images/${imageToDelete.id}/permanent`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Permanent delete failed");

      showNotification("success", "ลบรูปถาวรสำเร็จ");
      fetchTrashedImages();
    } catch (error) {
      console.error("Permanent delete error:", error);
      showNotification("error", "ลบรูปถาวรไม่สำเร็จ");
    } finally {
      setPermanentDeleteDialogOpen(false);
      setImageToDelete(null);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const currentImages = activeTab === "active" ? images : trashedImages;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#16bec9] to-[#14a8b2] bg-clip-text text-transparent">
            จัดการรูปภาพ
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            อัปโหลดรูปภาพสำหรับแสดงในคำตอบของ AI (Before/After, เทคนิค, ตัวอย่าง)
          </p>
        </div>
        <Button
          variant="outline"
          onClick={activeTab === "active" ? fetchImages : fetchTrashedImages}
          disabled={isLoading}
          className="gap-2 border-[#16bec9]/20 dark:border-slate-700 hover:bg-[#16bec9]/10 dark:hover:bg-slate-800"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          รีเฟรช
        </Button>
      </div>

      {/* Cute Upload Loader Overlay */}
      <CuteUploadLoader 
        isOpen={isUploading} 
        fileCount={selectedFiles.length}
      />

      {/* Notification */}
      {notification && (
        <div
          className={cn(
            "flex items-center gap-3 p-4 rounded-xl",
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
              : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800"
          )}
        >
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center",
            notification.type === "success" ? "bg-emerald-100 dark:bg-emerald-900" : "bg-rose-100 dark:bg-rose-900"
          )}>
            {notification.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
          </div>
          <span className="font-medium">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-auto hover:opacity-70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab("active")}
          className={cn(
            "px-4 py-2 font-medium transition-colors border-b-2",
            activeTab === "active"
              ? "border-[#16bec9] text-[#16bec9]"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            รูปภาพทั้งหมด
            <Badge variant="secondary" className="ml-1">{images.length}</Badge>
          </div>
        </button>
        <button
          onClick={() => setActiveTab("trash")}
          className={cn(
            "px-4 py-2 font-medium transition-colors border-b-2",
            activeTab === "trash"
              ? "border-rose-500 text-rose-500"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          <div className="flex items-center gap-2">
            <Trash className="h-4 w-4" />
            ถังขยะ
            <Badge variant="secondary" className="ml-1 bg-rose-100 text-rose-600">{trashedImages.length}</Badge>
          </div>
        </button>
      </div>

      {/* Upload Section - Only show in Active tab */}
      {activeTab === "active" && (
        <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#16bec9] to-[#14a8b2]" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#16bec9] to-[#14a8b2] flex items-center justify-center">
                <ImageIcon className="h-4 w-4 text-white" />
              </div>
              อัปโหลดรูปภาพ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Category Select */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    หมวดหมู่ (Category)
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCategoryDialogOpen(true)}
                    className="h-7 px-2 text-[#16bec9] hover:text-[#14a8b2] hover:bg-[#16bec9]/10"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    เพิ่มหมวดหมู่
                  </Button>
                </div>
                <Select value={category} onValueChange={setCategory} disabled={isLoadingCategories}>
                  <SelectTrigger className="h-10 border-[#16bec9]/20 dark:border-slate-700 focus:ring-[#16bec9]">
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.label} ({cat.value})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  ใช้สำหรับจัดกลุ่มและค้นหารูปภาพที่เหมาะสม
                </p>
              </div>

              {/* Subcategory Select */}
              {(availableSubcategories.length > 0 || categories.find(c => c.value === category)) && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      หมวดหมู่ย่อย (Subcategory)
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSubcategoryDialogOpen(true)}
                      disabled={!categories.find(c => c.value === category)}
                      className="h-7 px-2 text-[#16bec9] hover:text-[#14a8b2] hover:bg-[#16bec9]/10"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      เพิ่มหมวดหมู่ย่อย
                    </Button>
                  </div>
                  <Select value={subcategory} onValueChange={setSubcategory}>
                    <SelectTrigger className="h-10 border-[#16bec9]/20 dark:border-slate-700 focus:ring-[#16bec9]">
                      <SelectValue placeholder="เลือกหมวดหมู่ย่อย (ถ้ามี)" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubcategories.map((sub) => (
                        <SelectItem key={sub.value} value={sub.value}>
                          {sub.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    เลือกเฉพาะรูปภาพที่เกี่ยวข้องกับหัวข้อเฉพาะ
                  </p>
                </div>
              )}

              {/* File Upload Dropzone */}
              <div className="space-y-4">
                <div
                  className={cn(
                    "relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300",
                    "bg-gradient-to-br from-gray-50/50 to-gray-100/50 dark:from-slate-800/50 dark:to-slate-900/50",
                    "border-[#16bec9]/30 dark:border-[#16bec9]/20",
                    "hover:border-[#16bec9]/60 hover:from-[#16bec9]/5 hover:to-[#14a8b2]/5",
                    "dark:hover:border-[#16bec9]/40 dark:hover:from-[#16bec9]/10 dark:hover:to-[#14a8b2]/10",
                    selectedFiles.length > 0 && "border-[#16bec9] bg-[#16bec9]/5 dark:bg-[#16bec9]/10"
                  )}
                  onClick={() => document.getElementById("file-upload")?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = Array.from(e.dataTransfer.files);
                    handleFiles(files);
                  }}
                >
                  <input
                    id="file-upload"
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    multiple
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                    <div
                      className={cn(
                        "h-20 w-20 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300",
                        "bg-gradient-to-br from-[#16bec9]/10 to-[#14a8b2]/10",
                        "group-hover:from-[#16bec9]/20 group-hover:to-[#14a8b2]/20",
                        "group-hover:scale-110 group-hover:rotate-3"
                      )}
                    >
                      <ImageIcon className="h-10 w-10 text-[#16bec9] group-hover:text-[#14a8b2] transition-colors" />
                    </div>
                    
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      {selectedFiles.length > 0 
                        ? `เลือกแล้ว ${selectedFiles.length} ไฟล์`
                        : "ลากไฟล์มาวางที่นี่ หรือคลิกเลือก"
                      }
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      รองรับ: JPG, PNG, GIF, WEBP | ขนาดสูงสุด 10MB ต่อรูป
                    </p>
                    
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploading}
                      className="border-[#16bec9]/30 text-[#16bec9] hover:bg-[#16bec9]/10 hover:border-[#16bec9]/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById("file-upload")?.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      เลือกไฟล์
                    </Button>
                  </div>
                  
                  {/* Corner decorations */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-[#16bec9]/20 rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-[#16bec9]/20 rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-[#16bec9]/20 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-[#16bec9]/20 rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Upload Button */}
                {selectedFiles.length > 0 && (
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full h-12 bg-gradient-to-r from-[#16bec9] to-[#14a8b2] hover:from-[#14a8b2] hover:to-[#129aa3] text-white shadow-lg shadow-[#16bec9]/25"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        กำลังอัปโหลด {selectedFiles.length} รูป...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        อัปโหลด {selectedFiles.length} รูป
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="rounded-xl border border-[#16bec9]/20 dark:border-[#16bec9]/30 bg-gradient-to-br from-[#16bec9]/5 to-transparent p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      ไฟล์ที่เลือก ({selectedFiles.length})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFiles([]);
                        // Reset file input so same files can be selected again
                        const fileInput = document.getElementById("file-upload") as HTMLInputElement;
                        if (fileInput) fileInput.value = "";
                      }}
                      className="h-7 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      ล้างทั้งหมด
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedFiles.map((file, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#16bec9]/30 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#16bec9]/20 to-[#14a8b2]/20 flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="h-5 w-5 text-[#16bec9]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                        
                        <button
                          onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-400 hover:text-rose-500 transition-colors"
                          title="ลบไฟล์นี้"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>                
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trash Info Banner - Only show in Trash tab */}
      {activeTab === "trash" && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>ถังขยะ:</strong> รูปภาพที่ลบจะอยู่ที่นี่ คุณสามารถกู้คืนหรือลบถาวรได้
            </p>
          </div>
        </div>
      )}

      {/* Images List */}
      <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#16bec9] to-[#14a8b2]" />
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                {activeTab === "active" ? (
                  <FolderOpen className="h-4 w-4 text-white" />
                ) : (
                  <Trash className="h-4 w-4 text-white" />
                )}
              </div>
              {activeTab === "active" ? "รูปภาพทั้งหมด" : "ถังขยะ"}
            </div>
            <Badge 
              variant="secondary" 
              className={cn(
                "px-3 py-1",
                activeTab === "active" 
                  ? "bg-[#16bec9]/20 text-[#16bec9]"
                  : "bg-rose-100 text-rose-600"
              )}
            >
              {currentImages.length} รูป
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#16bec9]"></div>
                <div className="absolute inset-0 animate-spin rounded-full h-12 w-12 border-t-2 border-[#14a8b2]/70 animate-pulse"></div>
              </div>
            </div>
          ) : currentImages.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                {activeTab === "active" ? (
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                ) : (
                  <Trash className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                {activeTab === "active" ? "ยังไม่มีรูปภาพ" : "ถังขยะว่างเปล่า"}
              </h3>
              <p className="text-gray-500">
                {activeTab === "active" 
                  ? "อัปโหลดรูปภาพแรกของคุณเพื่อเริ่มต้น" 
                  : "ไม่มีรูปภาพในถังขยะ"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 dark:bg-slate-800/50 hover:bg-transparent">
                  <TableHead className="font-semibold">รูปภาพ</TableHead>
                  <TableHead className="font-semibold">คำอธิบาย (AI Generated)</TableHead>
                  <TableHead className="font-semibold">หมวดหมู่</TableHead>
                  <TableHead className="text-right font-semibold">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentImages.map((img) => (
                  <TableRow 
                    key={img.id} 
                    className={cn(
                      "transition-colors",
                      activeTab === "active" 
                        ? "hover:bg-[#16bec9]/5 dark:hover:bg-[#16bec9]/10"
                        : "hover:bg-rose-50 dark:hover:bg-rose-950/20"
                    )}
                  >
                    <TableCell>
                      <div 
                        className="relative h-16 w-16 rounded-lg overflow-hidden cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-[#16bec9] transition-colors"
                        onClick={() => setPreviewImage(img)}
                      >
                        <img
                          src={img.url}
                          alt={img.caption || "Image"}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ZoomIn className="h-4 w-4 text-white opacity-0 hover:opacity-100" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                          {img.caption || "ไม่มีคำอธิบาย"}
                        </p>
                        {img.extractedText && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            ข้อความในรูป: {img.extractedText}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {(() => {
                          const cat = getCategoryBadge(img.category);
                          return (
                            <Badge variant="outline" className="text-xs flex items-center gap-1.5 py-1.5 px-2 w-fit">
                              <span>{cat.icon}</span>
                              <span className="text-gray-700 dark:text-gray-300">{cat.label}</span>
                            </Badge>
                          );
                        })()}
                        {img.subcategory && (
                          <Badge variant="secondary" className="text-xs py-0.5 px-2 w-fit">
                            {subcategories.find(s => s.value === img.subcategory)?.label || img.subcategory}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {activeTab === "active" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          onClick={() => {
                            setImageToDelete(img);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            onClick={() => handleRestore(img)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => {
                              setImageToDelete(img);
                              setPermanentDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Soft Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-0 bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <Trash className="h-4 w-4 text-amber-600" />
              </div>
              ยืนยันการย้ายไปถังขยะ
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              รูปภาพจะถูกย้ายไปถังขยะ คุณสามารถกู้คืนได้ภายหลัง
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-gray-200 dark:border-slate-700"
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleDelete}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
            >
              <Trash className="h-4 w-4 mr-2" />
              ย้ายไปถังขยะ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <DialogContent className="border-0 bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-rose-600" />
              </div>
              ยืนยันการลบถาวร
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              รูปภาพจะถูกลบอย่างถาวรและไม่สามารถกู้คืนได้ คุณแน่ใจหรือไม่?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPermanentDeleteDialogOpen(false)}
              className="border-gray-200 dark:border-slate-700"
            >
              ยกเลิก
            </Button>
            <Button 
              variant="destructive"
              onClick={handlePermanentDelete}
              className="bg-gradient-to-r from-rose-500 to-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              ลบถาวร
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="border-0 bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <div className="h-8 w-8 rounded-full bg-[#16bec9]/10 dark:bg-[#16bec9]/20 flex items-center justify-center">
                <Tag className="h-4 w-4 text-[#16bec9]" />
              </div>
              เพิ่มหมวดหมู่ใหม่
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              สร้างหมวดหมู่สำหรับจัดกลุ่มรูปภาพ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cat-value" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                รหัสหมวดหมู่ (Value) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cat-value"
                placeholder="เช่น srs-promotion, before-after"
                value={newCategoryValue}
                onChange={(e) => setNewCategoryValue(e.target.value)}
                className="border-[#16bec9]/20 dark:border-slate-700 focus:ring-[#16bec9]"
              />
              <p className="text-xs text-gray-500">
                ใช้เฉพาะ a-z, 0-9, และขีดกลาง ระบบจะแปลงเป็นตัวพิมพ์เล็กอัตโนมัติ
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                ชื่อที่แสดง (Label) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cat-label"
                placeholder="เช่น โปรโมชั่น, ก่อน-หลัง"
                value={newCategoryLabel}
                onChange={(e) => setNewCategoryLabel(e.target.value)}
                className="border-[#16bec9]/20 dark:border-slate-700 focus:ring-[#16bec9]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-icon" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                ไอคอน (Emoji)
              </Label>
              <Select value={newCategoryIcon} onValueChange={setNewCategoryIcon}>
                <SelectTrigger className="border-[#16bec9]/20 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="📁">📁 แฟ้ม (Folder)</SelectItem>
                  <SelectItem value="🩺">🩺 แพทย์ (Medical)</SelectItem>
                  <SelectItem value="⭐">⭐ ดาว (Star)</SelectItem>
                  <SelectItem value="👨‍⚕️">👨‍⚕️ หมอ (Doctor)</SelectItem>
                  <SelectItem value="💰">💰 เงิน (Money)</SelectItem>
                  <SelectItem value="🏥">🏥 โรงพยาบาล (Hospital)</SelectItem>
                  <SelectItem value="🛏️">🛏️ ห้องพัก (Room)</SelectItem>
                  <SelectItem value="🎁">🎁 ของขวัญ (Gift)</SelectItem>
                  <SelectItem value="📸">📸 กล้อง (Camera)</SelectItem>
                  <SelectItem value="✨">✨ แวววับ (Sparkles)</SelectItem>
                  <SelectItem value="🔥">🔥 ไฟ (Fire)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCategoryDialogOpen(false);
                setNewCategoryValue("");
                setNewCategoryLabel("");
                setNewCategoryIcon("📁");
              }}
              className="border-gray-200 dark:border-slate-700"
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleCreateCategory}
              disabled={isCreatingCategory || !newCategoryValue.trim() || !newCategoryLabel.trim()}
              className="bg-gradient-to-r from-[#16bec9] to-[#14a8b2] text-white"
            >
              {isCreatingCategory ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  กำลังสร้าง...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  สร้างหมวดหมู่
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Subcategory Dialog */}
      <Dialog open={subcategoryDialogOpen} onOpenChange={setSubcategoryDialogOpen}>
        <DialogContent className="border-0 bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <div className="h-8 w-8 rounded-full bg-[#16bec9]/10 dark:bg-[#16bec9]/20 flex items-center justify-center">
                <Tag className="h-4 w-4 text-[#16bec9]" />
              </div>
              เพิ่มหมวดหมู่ย่อยใหม่
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              สร้างหมวดหมู่ย่อยสำหรับจัดกลุ่มรูปภาพ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Category Select */}
            <div className="space-y-2">
              <Label htmlFor="subcat-category" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                หมวดหมู่หลัก <span className="text-red-500">*</span>
              </Label>
              <Select value={newSubcategoryCategoryId} onValueChange={setNewSubcategoryCategoryId}>
                <SelectTrigger className="border-[#16bec9]/20 dark:border-slate-700 focus:ring-[#16bec9]">
                  <SelectValue placeholder="เลือกหมวดหมู่หลัก" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subcat-value" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                รหัสหมวดหมู่ย่อย (Value) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subcat-value"
                placeholder="เช่น dr-sarun, sigmoid"
                value={newSubcategoryValue}
                onChange={(e) => setNewSubcategoryValue(e.target.value)}
                className="border-[#16bec9]/20 dark:border-slate-700 focus:ring-[#16bec9]"
              />
              <p className="text-xs text-gray-500">
                ใช้เฉพาะ a-z, 0-9, และขีดกลาง ระบบจะแปลงเป็นตัวพิมพ์เล็กอัตโนมัติ
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subcat-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                ชื่อที่แสดง (Label) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subcat-label"
                placeholder="เช่น ดร.ศรัณย์, เทคนิค Sigmoid"
                value={newSubcategoryLabel}
                onChange={(e) => setNewSubcategoryLabel(e.target.value)}
                className="border-[#16bec9]/20 dark:border-slate-700 focus:ring-[#16bec9]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subcat-keywords" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                คำสำหรับ AI Detection (Keywords)
              </Label>
              <Input
                id="subcat-keywords"
                placeholder="เช่น ศรัณย์, sarun, หมอศรัณย์ (คั่นด้วยลูกน้ำ)"
                value={newSubcategoryKeywords}
                onChange={(e) => setNewSubcategoryKeywords(e.target.value)}
                className="border-[#16bec9]/20 dark:border-slate-700 focus:ring-[#16bec9]"
              />
              <p className="text-xs text-gray-500">
                คำเหล่านี้จะใช้ให้ AI ตรวจจับอัตโนมัติเมื่อผู้ใช้ถาม (คั่นด้วยลูกน้ำ)
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSubcategoryDialogOpen(false);
                setNewSubcategoryCategoryId("");
                setNewSubcategoryValue("");
                setNewSubcategoryLabel("");
                setNewSubcategoryKeywords("");
              }}
              className="border-gray-200 dark:border-slate-700"
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleCreateSubcategory}
              disabled={isCreatingSubcategory || !newSubcategoryCategoryId || !newSubcategoryValue.trim() || !newSubcategoryLabel.trim()}
              className="bg-gradient-to-r from-[#16bec9] to-[#14a8b2] text-white"
            >
              {isCreatingSubcategory ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  กำลังสร้าง...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  สร้างหมวดหมู่ย่อย
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background/95 backdrop-blur-sm">
          {previewImage && (
            <div className="relative">
              <img
                src={previewImage.url}
                alt={previewImage.caption || "Preview"}
                className="w-full max-h-[80vh] object-contain"
              />
              {previewImage.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-4">
                  <p className="font-medium">{previewImage.caption}</p>
                  {previewImage.extractedText && (
                    <p className="text-sm text-gray-300 mt-1">
                      ข้อความในรูป: {previewImage.extractedText}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
