import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Download, Eye, Trash2, FileText, Clock, User, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  fileName: string;
  category: string;
  uploadedBy: string;
  uploadedAt: string;
  fileSize: string;
  version: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

interface DocumentUploadSectionProps {
  studentId: string;
  studentName: string;
}

const documentCategories = [
  { value: 'academic', label: 'Academic Certificates' },
  { value: 'test_scores', label: 'Test Scores (IELTS, TOEFL, GRE, etc.)' },
  { value: 'financial', label: 'Financial Documents' },
  { value: 'passport_visa', label: 'Passport/Visa' },
  { value: 'personal_docs', label: 'SOP, LOR, Resume' },
  { value: 'other', label: 'Other Documents' }
];

export default function DocumentUploadSection({ studentId, studentName }: DocumentUploadSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useApiQuery<Document[]>(
    ['/api/counselor/student-documents', studentId],
    `/api/counselor/student-documents/${studentId}`,
    undefined
  );

  // Check student's subscription status for document upload permissions
  const { data: subscriptionStatus, isLoading: isLoadingSubscription } = useApiQuery<any>(
    ['/api/counselor/student-subscription', studentId],
    `/api/counselor/student-subscription/${studentId}`,
    undefined
  );

  const uploadMutation = useApiMutation(
    async (formData: FormData) => {
      return await api.post(`/api/counselor/upload-document/${studentId}`, formData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/counselor/student-documents', studentId] });
        setIsUploadDialogOpen(false);
        setUploadFile(null);
        setSelectedCategory("");
        toast({
          title: "Document uploaded successfully",
          description: "The document has been uploaded and is ready for review."
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to upload document",
          variant: "destructive"
        });
      }
    }
  );

  const deleteMutation = useApiMutation(
    async (documentId: string) => {
      return await api.delete(`/api/counselor/delete-document/${documentId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/counselor/student-documents', studentId] });
        toast({
          title: "Document deleted",
          description: "The document has been successfully removed."
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to delete document",
          variant: "destructive"
        });
      }
    }
  );

  const handleUpload = () => {
    if (!uploadFile || !selectedCategory) return;
    
    // Check subscription status before allowing upload
    if (!subscriptionStatus?.canUploadDocuments) {
      toast({
        title: "Upload restricted",
        description: subscriptionStatus?.message || "Document upload requires an active subscription plan",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('category', selectedCategory);
    formData.append('studentId', studentId);

    uploadMutation.mutate(formData);
  };

  const handleDownload = (documentId: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = `/api/counselor/download-document/${documentId}`;
    link.download = fileName;
    link.click();
  };

  const groupedDocuments = documentCategories.map(category => ({
    ...category,
    documents: documents.filter((doc: Document) => doc.category === category.value),
    count: documents.filter((doc: Document) => doc.category === category.value).length
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            📁 Student Documents - {studentName}
          </span>
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!subscriptionStatus?.canUploadDocuments}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document for {studentName}</DialogTitle>
                <DialogDescription>
                  Upload a document on behalf of the student. Choose the appropriate category.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Document Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document category" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentCategories.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">File</label>
                  <Input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={!uploadFile || !selectedCategory || uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Upload and manage documents on behalf of your assigned students
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Subscription Status Indicator */}
        {subscriptionStatus && (
          <div className={`mb-4 p-3 rounded-lg border flex items-center gap-2 ${
            subscriptionStatus.status === 'active' 
              ? 'bg-green-100 text-green-800 border-green-200'
              : subscriptionStatus.status === 'expired'
                ? 'bg-red-100 text-red-800 border-red-200'
                : subscriptionStatus.status === 'inactive'
                  ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  : 'bg-gray-100 text-gray-800 border-gray-200'
          }`}>
            {subscriptionStatus.status === 'active' ? (
              <Eye className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <div className="flex-1">
              <div className="font-medium">
                {subscriptionStatus.hasSubscription 
                  ? `${subscriptionStatus.tier.charAt(0).toUpperCase() + subscriptionStatus.tier.slice(1)} Plan` 
                  : 'No Active Plan'}
              </div>
              <div className="text-sm">{subscriptionStatus.message}</div>
              {subscriptionStatus.endDate && (
                <div className="text-sm mt-1">
                  Expires: {new Date(subscriptionStatus.endDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        )}
        <Tabs defaultValue="academic" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            {documentCategories.map(category => {
              const categoryData = groupedDocuments.find(g => g.value === category.value);
              return (
                <TabsTrigger key={category.value} value={category.value} className="text-xs">
                  {category.label.split(' ')[0]}
                  {categoryData && categoryData.count > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {categoryData.count}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {documentCategories.map(category => {
            const categoryDocuments = documents.filter((doc: Document) => doc.category === category.value);
            
            return (
              <TabsContent key={category.value} value={category.value}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">{category.label}</h3>
                    <Badge variant="outline">
                      {categoryDocuments.length} document{categoryDocuments.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {categoryDocuments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No documents in this category</p>
                      <p className="text-sm">Upload documents to get started</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File Name</TableHead>
                          <TableHead>Version</TableHead>
                          <TableHead>Uploaded By</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryDocuments.map((doc: Document) => (
                          <TableRow key={doc.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <div>
                                  <p className="font-medium">{doc.fileName}</p>
                                  <p className="text-sm text-gray-500">{doc.fileSize}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">v{doc.version}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span className="text-sm">{doc.uploadedBy}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span className="text-sm">{doc.uploadedAt}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  doc.status === 'approved' ? 'default' :
                                  doc.status === 'rejected' ? 'destructive' : 'secondary'
                                }
                              >
                                {doc.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownload(doc.id, doc.fileName)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteMutation.mutate(doc.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}