import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@/hooks/api-hooks";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { Download, Upload, AlertCircle, CheckCircle, FileText } from "lucide-react";
import * as XLSX from 'xlsx';

interface BulkImportUniversitiesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string; data?: any }>;
}

export default function BulkImportUniversities({ open, onOpenChange }: BulkImportUniversitiesProps) {
  const [excelContent, setExcelContent] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Download sample Excel template
  const downloadTemplate = async () => {
    try {
      // For text responses, we use apiRequest directly with response handling
      const response = await api.get("/api/admin/universities/sample-csv");
      const csvData = response as string; // apiRequest now returns raw text for CSV responses
      
      // Parse CSV data properly using XLSX CSV parser
      const workbook = XLSX.read(csvData, { type: 'string' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Create new workbook for Excel format
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, worksheet, "Universities");
      
      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'university_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Template Downloaded",
        description: "Use this Excel template to format your university data"
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download the template file",
        variant: "destructive"
      });
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Invalid File",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as ArrayBuffer;
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to CSV format for backend compatibility
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);
      setExcelContent(csvContent);
    };
    reader.readAsArrayBuffer(file);
  };

  // Bulk import mutation
  const bulkImportMutation = useApiMutation(
    async (excelData: string): Promise<ImportResult> => {
      // API client now auto-unwraps the envelope, so we get the result directly
      const response: any = await api.post("/api/admin/universities/bulk-import", { csvContent: excelData });
      return response;
    },
    {
      onSuccess: (result: ImportResult) => {
        setImportResult(result);
        setIsImporting(false);
        
        if (result.success > 0) {
          queryClient.invalidateQueries({ queryKey: ["/api/admin/universities"] });
          toast({
            title: "Import Completed",
            description: `Successfully imported ${result.success} universities${result.failed > 0 ? ` (${result.failed} failed)` : ''}`
          });
        }
      },
      onError: (error: any) => {
        setIsImporting(false);
        toast({
          title: "Import Failed",
          description: error.message || "Failed to import universities",
          variant: "destructive"
        });
      }
    }
  );

  const handleImport = () => {
    if (!excelContent.trim()) {
      toast({
        title: "No Data",
        description: "Please paste Excel content or upload a file",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    bulkImportMutation.mutate(excelContent);
  };

  const handleClose = () => {
    setExcelContent("");
    setImportResult(null);
    setIsImporting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Upload className="h-5 w-5 text-blue-600" />
            </div>
            Bulk Import Universities
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Import multiple universities at once using Excel format. Download the template first for proper formatting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Step 1: Download Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Download the Excel template with sample data to understand the required format and column headers.
              </p>
              <Button onClick={downloadTemplate} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Excel Template
              </Button>
            </CardContent>
          </Card>

          {/* File Upload or Paste */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 2: Upload Your Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Upload Excel File</label>
                <div 
                  className={`
                    border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200
                    ${isDragOver 
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }
                  `}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      const event = { target: { files } } as any;
                      handleFileUpload(event);
                    }
                  }}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Drag and drop your Excel file here, or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label 
                    htmlFor="excel-upload"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </label>
                </div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or paste Excel content</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Excel Content (CSV format)</label>
                <Textarea
                  placeholder="Paste your Excel content in CSV format here..."
                  value={excelContent}
                  onChange={(e) => setExcelContent(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Import Progress */}
          {isImporting && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Progress value={50} className="flex-1" />
                  <span className="text-sm text-muted-foreground">Importing...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Results */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {importResult.success > 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                    <div className="text-sm text-muted-foreground">Successfully Imported</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Errors:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                          <div className="font-medium">Row {error.row}: {error.error}</div>
                          {error.data && (
                            <div className="text-muted-foreground mt-1">
                              Data: {Array.isArray(error.data) ? error.data.join(', ') : JSON.stringify(error.data)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="px-6 py-2"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!excelContent.trim() || isImporting}
              className="min-w-[140px] px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Universities
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}