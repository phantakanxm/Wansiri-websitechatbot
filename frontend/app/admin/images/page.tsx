"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface UploadedImage {
  id: string;
  url: string;
  caption?: string;
  extractedText?: string;
  category: string;
}

// Categories for image classification
const CATEGORIES = [
  { value: "srs-tec", label: "🩺 เทคนิคการผ่าตัด (Technique)" },
  { value: "srs-review", label: "⭐ รีวิว/ผลลัพธ์ (Review)" },
  { value: "srs-doctor", label: "👨‍⚕️ ข้อมูลแพทย์ (Doctor)" },
  { value: "srs-package", label: "💰 แพ็คเกจ/ราคา (Package)" },
  { value: "srs-facility", label: "🏥 สถานที่/ห้องผ่าตัด (Facility)" },
  { value: "general", label: "📁 ทั่วไป (General)" },
];

export default function ImagesPage() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [trashedImages, setTrashedImages] = useState<UploadedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [category, setCategory] = useState("general");
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

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
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
    }
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
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  หมวดหมู่ (Category)
                </label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-10 border-[#16bec9]/20 dark:border-slate-700 focus:ring-[#16bec9]">
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  ใช้สำหรับจัดกลุ่มและค้นหารูปภาพที่เหมาะสม
                </p>
              </div>

              {/* File Input */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="relative flex-1">
                  <Input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    multiple
                    className="h-12 border-[#16bec9]/20 dark:border-slate-700 focus:ring-[#16bec9] cursor-pointer"
                  />
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || isUploading}
                  className="h-12 px-6 bg-gradient-to-r from-[#16bec9] to-[#14a8b2] hover:from-[#14a8b2] hover:to-[#129aa3] text-white shadow-lg shadow-[#16bec9]/25"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      กำลังอัปโหลด...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      อัปโหลด {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                    </>
                  )}
                </Button>
              </div>

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-[#16bec9]/10 dark:bg-[#16bec9]/10 border border-[#16bec9]/20 dark:border-[#16bec9]/30 rounded-xl">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                      <button
                        onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="p-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#16bec9]" />
                รองรับ: JPG, PNG, GIF, WEBP | ขนาดสูงสุด: 10MB ต่อรูป | สูงสุด 10 รูปต่อครั้ง
              </p>
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
                      <Badge variant="outline" className="text-xs">
                        {img.category}
                      </Badge>
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
