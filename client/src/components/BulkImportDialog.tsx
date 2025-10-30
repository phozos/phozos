import { useState } from "react";
import { useApiMutation } from "@/hooks/api-hooks";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function BulkImportDialog({ open, onOpenChange, onImportComplete }: BulkImportDialogProps) {
  console.log("BulkImportDialog - open prop:", open);
  const [file, setFile] = useState<File | null>(null);
  const [textData, setTextData] = useState("");
  const [inputMethod, setInputMethod] = useState<"file" | "text">("file");
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);
  
  const { toast } = useToast();

  const bulkImportMutation = useApiMutation(
    async (data: { csvContent: string }) => {
      return api.post("/api/admin/universities/bulk-import", data);
    },
    {
      onSuccess: (results: any) => {
        setImportResults({
          successful: results.success,
          failed: results.failed,
          errors: results.errors || []
        });
        setImportProgress(100);
        toast({
          title: "Import completed",
          description: `Successfully imported ${results.success} universities`,
        });
        onImportComplete();
      },
      onError: (error: any) => {
        toast({
          title: "Import failed",
          description: error.message || "Failed to import universities",
          variant: "destructive",
        });
      },
    }
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Validate CSV file
      if (!selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
    }
  };

  const handleImport = async () => {
    let dataToImport = "";
    
    if (inputMethod === "file" && file) {
      // Read file content
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });
      dataToImport = fileContent;
    } else {
      dataToImport = textData;
    }

    if (!dataToImport.trim()) {
      toast({
        title: "No data provided",
        description: "Please provide data to import",
        variant: "destructive",
      });
      return;
    }

    setImportProgress(10);
    bulkImportMutation.mutate({
      csvContent: dataToImport
    });
  };

  const handleClose = () => {
    // Reset state
    setFile(null);
    setTextData("");
    setImportProgress(0);
    setImportResults(null);
    setInputMethod("file");
    onOpenChange(false);
  };

  const csvTemplate = `name,country,city,description,website,ranking,acceptanceRate,feesMin,feesMax,scholarships
Stanford University,USA,Stanford,A leading research university in Silicon Valley,https://www.stanford.edu,5,4.3,50000,60000,Need-based and merit scholarships available
MIT,USA,Cambridge,Premier institute for technology and innovation,https://www.mit.edu,2,6.7,53000,65000,Various undergraduate and graduate scholarships`;

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={() => onOpenChange(false)}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Bulk Import Universities</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Import multiple universities from CSV format</p>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
          {/* Import Method Selection */}
          <div className="grid grid-cols-2 gap-4">
            <Card className={`cursor-pointer border-2 ${inputMethod === "file" ? "border-blue-500" : "border-gray-200"}`}>
              <CardContent className="p-4" onClick={() => setInputMethod("file")}>
                <div className="flex items-center space-x-3">
                  <Upload className="w-5 h-5" />
                  <div>
                    <h3 className="font-medium">Upload File</h3>
                    <p className="text-sm text-gray-600">Upload CSV file</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className={`cursor-pointer border-2 ${inputMethod === "text" ? "border-blue-500" : "border-gray-200"}`}>
              <CardContent className="p-4" onClick={() => setInputMethod("text")}>
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5" />
                  <div>
                    <h3 className="font-medium">Paste Data</h3>
                    <p className="text-sm text-gray-600">Paste CSV data directly</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>



          {/* File Upload or Text Input */}
          {inputMethod === "file" ? (
            <div className="space-y-2">
              <Label>Select File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
              />
              {file && (
                <p className="text-sm text-gray-600">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Paste CSV Data</Label>
              <Textarea
                placeholder="Paste your CSV data here..."
                value={textData}
                onChange={(e) => setTextData(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          )}

          {/* CSV Template */}
          <div className="space-y-2">
            <Label>CSV Template</Label>
            <div className="bg-gray-50 p-3 rounded-md">
              <pre className="text-xs overflow-x-auto">
                {csvTemplate}
              </pre>
            </div>
          </div>

          {/* Progress */}
          {bulkImportMutation.isPending && (
            <div className="space-y-2">
              <Label>Import Progress</Label>
              <Progress value={importProgress} className="w-full" />
              <p className="text-sm text-gray-600">Processing universities...</p>
            </div>
          )}

          {/* Results */}
          {importResults && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Import completed: {importResults.successful} successful, {importResults.failed} failed
                </AlertDescription>
              </Alert>
              
              {importResults.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p>Errors during import:</p>
                      {importResults.errors.slice(0, 5).map((error, index) => (
                        <p key={index} className="text-sm">• {error}</p>
                      ))}
                      {importResults.errors.length > 5 && (
                        <p className="text-sm">... and {importResults.errors.length - 5} more errors</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>
                {importResults ? "Close" : "Cancel"}
              </Button>
              {!importResults && (
                <Button 
                  onClick={handleImport}
                  disabled={bulkImportMutation.isPending || (!file && !textData.trim())}
                >
                  {bulkImportMutation.isPending ? "Importing..." : "Import Universities"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}