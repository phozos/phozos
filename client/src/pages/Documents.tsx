import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/ui/file-upload";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { 
  Upload, 
  FileText, 
  Image, 
  File,
  Download,
  Trash2,
  Eye,
  Check,
  X,
  Clock,
  AlertCircle,
  Zap,
  FolderOpen,
  Filter
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DOCUMENT_TYPES } from "@/lib/constants";

// Mock user for demo
const mockUser = {
  id: "user-1",
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  userType: "customer"
};

interface Document {
  id: string;
  userId: string;
  applicationId?: string;
  type: string;
  name: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  description?: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  tags?: string[];
  metadata?: {
    ocrText?: string;
    qualityScore?: number;
    extractedData?: Record<string, any>;
  };
  createdAt: string;
  updatedAt: string;
}

const documentTypeConfig = {
  transcript: { 
    label: "Academic Transcripts", 
    icon: FileText, 
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20" 
  },
  test_score: { 
    label: "Test Scores", 
    icon: FileText, 
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20" 
  },
  essay: { 
    label: "Essays & Letters", 
    icon: FileText, 
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-900/20" 
  },
  recommendation: { 
    label: "Recommendations", 
    icon: FileText, 
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-900/20" 
  },
  resume: { 
    label: "Resume/CV", 
    icon: FileText, 
    color: "text-teal-600",
    bgColor: "bg-teal-50 dark:bg-teal-900/20" 
  },
  certificate: { 
    label: "Certificates", 
    icon: FileText, 
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-900/20" 
  },
  other: { 
    label: "Other Documents", 
    icon: File, 
    color: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-900/20" 
  },
};

export default function Documents() {
  const [user] = useState(mockUser);
  const [selectedTab, setSelectedTab] = useState("all");
  const [uploadType, setUploadType] = useState<string>("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch documents
  const { data: documents = [], isLoading } = useApiQuery(
    ["/api/documents"],
    "/api/documents",
    undefined,
    { staleTime: 2 * 60 * 1000 } // 2 minutes
  );

  // Upload document mutation
  const uploadMutation = useApiMutation(
    async (documentData: any) => {
      return api.post("/api/documents", documentData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        setShowUploadDialog(false);
        toast({
          title: "Document uploaded",
          description: "Your document has been successfully uploaded.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to upload document",
          variant: "destructive",
        });
      },
    }
  );

  // Delete document mutation
  const deleteMutation = useApiMutation(
    async (documentId: string) => {
      return api.delete(`/api/documents/${documentId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        toast({
          title: "Document deleted",
          description: "Document has been successfully deleted.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to delete document",
          variant: "destructive",
        });
      },
    }
  );

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return Image;
    if (mimeType.includes("pdf")) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getDocumentsByType = (type: string) => {
    if (type === "all") return documents;
    return documents.filter((doc: Document) => doc.type === type);
  };

  const getTypeCounts = () => {
    const counts: Record<string, number> = { all: documents.length };
    Object.keys(documentTypeConfig).forEach(type => {
      counts[type] = documents.filter((doc: Document) => doc.type === type).length;
    });
    return counts;
  };

  const handleFileUpload = (files: File[]) => {
    if (files.length === 0 || !uploadType) return;

    files.forEach(file => {
      const documentData = {
        type: uploadType,
        name: file.name,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        filePath: `/uploads/${file.name}`, // In real app, this would be generated by server
        description: `Uploaded ${file.name}`,
        tags: [uploadType],
      };

      uploadMutation.mutate(documentData);
    });
  };

  const typeCounts = getTypeCounts();
  const currentDocuments = getDocumentsByType(selectedTab);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <LoadingSkeleton type="card" count={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Document Management
            </h1>
            <p className="text-muted-foreground">
              Upload, organize, and manage your application documents
            </p>
          </div>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Upload Documents
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload Documents</DialogTitle>
                <DialogDescription>
                  Select document type and upload your files
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Document Type Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Document Type
                  </label>
                  <Select value={uploadType} onValueChange={setUploadType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(documentTypeConfig).map(([type, config]) => (
                        <SelectItem key={type} value={type}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* File Upload */}
                {uploadType && (
                  <FileUpload
                    onFilesSelect={handleFileUpload}
                    maxFiles={5}
                    maxSize={10}
                    acceptedTypes={[".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"]}
                  />
                )}

                {/* AI Features Info */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      AI-Powered Features
                    </span>
                  </div>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <li>• Automatic document categorization</li>
                    <li>• OCR text extraction and searchability</li>
                    <li>• Quality assessment and recommendations</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Documents
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {documents.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Verified
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {documents.filter((doc: Document) => doc.isVerified).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending Review
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {documents.filter((doc: Document) => !doc.isVerified).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Upload className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Storage Used
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatFileSize(documents.reduce((total: number, doc: Document) => total + doc.fileSize, 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle>My Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="mb-6 flex-wrap h-auto">
                <TabsTrigger value="all">All ({typeCounts.all})</TabsTrigger>
                {Object.entries(documentTypeConfig).map(([type, config]) => (
                  <TabsTrigger key={type} value={type}>
                    {config.label} ({typeCounts[type] || 0})
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={selectedTab}>
                {currentDocuments.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentDocuments.map((document: Document) => {
                      const FileIcon = getFileIcon(document.mimeType);
                      const typeConfig = documentTypeConfig[document.type as keyof typeof documentTypeConfig];

                      return (
                        <Card key={document.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            {/* Document Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 ${typeConfig?.bgColor} rounded-lg`}>
                                  <FileIcon className={`w-6 h-6 ${typeConfig?.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-foreground truncate">
                                    {document.name}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {typeConfig?.label}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Verification Status */}
                              {document.isVerified ? (
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                  <Check className="w-3 h-3 mr-1" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-600 border-amber-200">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </div>

                            {/* Document Info */}
                            <div className="space-y-2 mb-4">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Size:</span>
                                <span className="text-foreground">{formatFileSize(document.fileSize)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Uploaded:</span>
                                <span className="text-foreground">
                                  {new Date(document.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              {document.metadata?.qualityScore && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Quality:</span>
                                  <span className="text-foreground">
                                    {Math.round(document.metadata.qualityScore)}%
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Tags */}
                            {document.tags && document.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-4">
                                {document.tags.map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" className="flex-1">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              <Button variant="outline" size="sm" className="flex-1">
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Delete Document</DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to delete "{document.name}"? This action cannot be undone.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <Button variant="outline">Cancel</Button>
                                    <Button 
                                      variant="destructive"
                                      onClick={() => deleteMutation.mutate(document.id)}
                                      disabled={deleteMutation.isPending}
                                    >
                                      {deleteMutation.isPending ? "Deleting..." : "Delete"}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  /* Empty State */
                  <div className="text-center py-12">
                    <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {selectedTab === "all" ? "No documents uploaded" : `No ${documentTypeConfig[selectedTab as keyof typeof documentTypeConfig]?.label.toLowerCase()} uploaded`}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {selectedTab === "all" 
                        ? "Upload your first document to get started"
                        : `Upload your ${documentTypeConfig[selectedTab as keyof typeof documentTypeConfig]?.label.toLowerCase()} here`
                      }
                    </p>
                    <Button onClick={() => setShowUploadDialog(true)}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
