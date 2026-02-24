"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/language-context";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  File,
  AlertCircle,
  CheckCircle,
  X,
  FolderOpen,
  FilePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CuteUploadLoader } from "@/components/cute-upload-loader";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Document {
  name: string;
  displayName: string;
  createTime: string;
  state: string;
}

export default function DocumentsPage() {
  const { t } = useLanguage();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/files`);
      if (!response.ok) throw new Error("Failed to fetch documents");
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      showNotification("error", t("fetchError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Show notification
  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Handle file validation and selection
  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;
    
    // Documents only accept single file
    const file = files[0];
    
    // Validate file type
    const allowedTypes = [".pdf", ".txt", ".md"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      showNotification("error", t("invalidFileType"));
      return;
    }
    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showNotification("error", t("fileTooLarge"));
      return;
    }
    setSelectedFile(file);
  };

  // Handle file selection from input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${API_URL}/api/admin/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      showNotification("success", t("uploadSuccess"));
      setSelectedFile(null);
      fetchDocuments();
    } catch (error) {
      console.error("Upload error:", error);
      showNotification("error", t("uploadError"));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      const response = await fetch(
        `${API_URL}/api/admin/delete?docId=${encodeURIComponent(documentToDelete.name)}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Delete failed");

      showNotification("success", t("deleteSuccess"));
      fetchDocuments();
    } catch (error) {
      console.error("Delete error:", error);
      showNotification("error", t("deleteError"));
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
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

  // Get file icon with gradient background
  const getFileIcon = (filename: string) => {
    const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
    const styles = {
      pdf: "from-rose-500 to-orange-500",
      txt: "from-blue-500 to-cyan-500",
      md: "from-gray-500 to-slate-500",
      default: "from-[#16bec9] to-[#14a8b2]",
    };
    
    const style = ext === ".pdf" ? styles.pdf : 
                  ext === ".txt" ? styles.txt : 
                  ext === ".md" ? styles.md : styles.default;

    return (
      <div className={cn(
        "h-10 w-10 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-lg",
        style
      )}>
        <FileText className="h-5 w-5 text-white" />
      </div>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#16bec9] to-[#14a8b2] bg-clip-text text-transparent">
            {t("documents")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage Knowledge Base Documents for AI Responses
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchDocuments}
          disabled={isLoading}
          className="gap-2 border-[#16bec9]/20 dark:border-slate-700 hover:bg-[#16bec9]/10 dark:hover:bg-slate-800"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          {t("refresh")}
        </Button>
      </div>

      {/* Cute Upload Loader Overlay */}
      <CuteUploadLoader 
        isOpen={isUploading} 
        fileCount={selectedFile ? 1 : 0}
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

      {/* Upload Card */}
      <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#16bec9] to-[#14a8b2]" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#16bec9] to-[#14a8b2] flex items-center justify-center">
              <FilePlus className="h-4 w-4 text-white" />
            </div>
            {t("uploadDocument")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* File Upload Dropzone */}
            <div className="space-y-4">
              <div
                className={cn(
                  "relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300",
                  "bg-gradient-to-br from-gray-50/50 to-gray-100/50 dark:from-slate-800/50 dark:to-slate-900/50",
                  "border-[#16bec9]/30 dark:border-[#16bec9]/20",
                  "hover:border-[#16bec9]/60 hover:from-[#16bec9]/5 hover:to-[#14a8b2]/5",
                  "dark:hover:border-[#16bec9]/40 dark:hover:from-[#16bec9]/10 dark:hover:to-[#14a8b2]/10",
                  selectedFile && "border-[#16bec9] bg-[#16bec9]/5 dark:bg-[#16bec9]/10"
                )}
                onClick={() => document.getElementById("doc-file-upload")?.click()}
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
                  id="doc-file-upload"
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleFileChange}
                  disabled={isUploading}
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
                    <FilePlus className="h-10 w-10 text-[#16bec9] group-hover:text-[#14a8b2] transition-colors" />
                  </div>
                  
                  <p className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    {selectedFile 
                      ? "เลือกไฟล์แล้ว 1 ไฟล์"
                      : "ลากไฟล์มาวางที่นี่ หรือคลิกเลือก"
                    }
                  </p>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {t("supportedFormats")}: PDF, TXT, MD | {t("maxSize")}: 10MB
                  </p>
                  
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploading}
                    className="border-[#16bec9]/30 text-[#16bec9] hover:bg-[#16bec9]/10 hover:border-[#16bec9]/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById("doc-file-upload")?.click();
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t("chooseFile")}
                  </Button>
                </div>
                
                {/* Corner decorations */}
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-[#16bec9]/20 rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-[#16bec9]/20 rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-[#16bec9]/20 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-[#16bec9]/20 rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Upload Button */}
              {selectedFile && (
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full h-12 bg-gradient-to-r from-[#16bec9] to-[#14a8b2] hover:from-[#14a8b2] hover:to-[#129aa3] text-white shadow-lg shadow-[#16bec9]/25"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {t("uploading")}...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {t("upload")}
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Selected File Preview */}
            {selectedFile && (
              <div className="rounded-xl border border-[#16bec9]/20 dark:border-[#16bec9]/30 bg-gradient-to-br from-[#16bec9]/5 to-transparent p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    ไฟล์ที่เลือก
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      // Reset file input so same file can be selected again
                      const fileInput = document.getElementById("doc-file-upload") as HTMLInputElement;
                      if (fileInput) fileInput.value = "";
                    }}
                    className="h-7 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    {t("remove")}
                  </Button>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  {getFileIcon(selectedFile.name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <FolderOpen className="h-4 w-4 text-white" />
              </div>
              {t("documentList")}
            </div>
            <Badge 
              variant="secondary" 
              className="bg-[#16bec9]/20 text-[#16bec9] dark:bg-[#16bec9]/20 dark:text-[#16bec9]/70 px-3 py-1"
            >
              {documents.length} {t("files")}
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
          ) : documents.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{t("noDocuments")}</h3>
              <p className="text-gray-500">Upload Your First Document to Get Started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 dark:bg-slate-800/50 hover:bg-transparent">
                  <TableHead className="font-semibold">{t("fileName")}</TableHead>
                  <TableHead className="font-semibold">{t("status")}</TableHead>
                  <TableHead className="font-semibold">{t("uploadedAt")}</TableHead>
                  <TableHead className="text-right font-semibold">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow 
                    key={doc.name} 
                    className="hover:bg-[#16bec9]/5 dark:hover:bg-[#16bec9]/10 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.displayName)}
                        <span className="font-medium text-gray-900 dark:text-white truncate max-w-[300px]">
                          {doc.displayName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          doc.state === "STATE_ACTIVE"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                        )}
                      >
                        {doc.state === "STATE_ACTIVE" ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t("active")}
                          </>
                        ) : (
                          doc.state
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {formatDate(doc.createTime)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        onClick={() => {
                          setDocumentToDelete(doc);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-0 bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-rose-600" />
              </div>
              {t("confirmDelete")}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              {t("deleteWarning")}
              <br />
              <strong className="text-gray-900 dark:text-white">{documentToDelete?.displayName}</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-gray-200 dark:border-slate-700"
            >
              {t("cancel")}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              className="bg-gradient-to-r from-rose-500 to-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
