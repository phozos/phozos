import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApiQuery } from "@/hooks/api-hooks";
import { api } from "@/lib/api-client";

interface UniversityExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const exportFields = [
  { 
    id: "basic", 
    label: "Basic Information", 
    fields: ["name", "country", "city", "website", "worldRanking"],
    description: "University name, location, and world ranking"
  },
  { 
    id: "academics", 
    label: "Academic Details", 
    fields: ["degreeLevels", "specialization", "description"],
    description: "Degree programs and specializations offered" 
  },
  { 
    id: "fees", 
    label: "Fee Information", 
    fields: ["offerLetterFee", "annualFee"],
    description: "Offer letter and annual tuition fees"
  },
  { 
    id: "admissions", 
    label: "Admission Requirements", 
    fields: ["admissionRequirements"],
    description: "GPA, IELTS, and GMAT requirements"
  },
  { 
    id: "alumni", 
    label: "Notable Alumni", 
    fields: ["alumni1", "alumni2", "alumni3"],
    description: "Known successful graduates"
  }
];

export default function UniversityExport({ open, onOpenChange }: UniversityExportProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>(["basic", "academics", "fees"]);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [isExporting, setIsExporting] = useState(false);
  
  const { toast } = useToast();

  // Fetch universities data
  const { data: universities = [] } = useApiQuery(
    ["/api/admin/universities"],
    '/api/admin/universities',
    undefined,
    { enabled: open }
  );

  const typedUniversities = universities as any[];

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const flattenUniversityData = (university: any) => {
    const flattened: any = {};
    
    // Get selected field names
    const fieldsToInclude = exportFields
      .filter(group => selectedFields.includes(group.id))
      .flatMap(group => group.fields);

    fieldsToInclude.forEach(field => {
      const value = university[field];
      
      if (typeof value === 'object' && value !== null) {
        // Handle nested objects
        if (Array.isArray(value)) {
          flattened[field] = value.join('; ');
        } else {
          // Flatten object properties
          Object.entries(value).forEach(([key, val]) => {
            flattened[`${field}_${key}`] = val;
          });
        }
      } else {
        flattened[field] = value || '';
      }
    });

    return flattened;
  };

  const generateCSV = (data: any[]) => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast({
        title: "No fields selected",
        description: "Please select at least one field group to export.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);

    try {
      // Flatten university data based on selected fields
      const flattenedData = typedUniversities.map(flattenUniversityData);
      
      let content: string;
      let mimeType: string;
      let filename: string;

      if (exportFormat === "csv") {
        content = generateCSV(flattenedData);
        mimeType = "text/csv";
        filename = `universities_export_${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        content = JSON.stringify(flattenedData, null, 2);
        mimeType = "application/json";
        filename = `universities_export_${new Date().toISOString().split('T')[0]}.json`;
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Downloaded ${typedUniversities.length} universities in ${exportFormat.toUpperCase()} format.`
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "Failed to export university data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export University Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="csv-format"
                  checked={exportFormat === "csv"}
                  onCheckedChange={() => setExportFormat("csv")}
                />
                <Label htmlFor="csv-format" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4" />
                  CSV (Excel-friendly)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="json-format"
                  checked={exportFormat === "json"}
                  onCheckedChange={() => setExportFormat("json")}
                />
                <Label htmlFor="json-format" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="w-4 h-4" />
                  JSON (Developer-friendly)
                </Label>
              </div>
            </div>
          </div>

          {/* Field Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select Data to Export</Label>
            <div className="grid grid-cols-2 gap-3">
              {exportFields.map((group) => (
                <div key={group.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={group.id}
                    checked={selectedFields.includes(group.id)}
                    onCheckedChange={() => handleFieldToggle(group.id)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor={group.id} className="cursor-pointer font-medium">
                      {group.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {group.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export Summary */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Export Summary: {typedUniversities.length} universities, {selectedFields.length} field groups selected
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting || selectedFields.length === 0}>
              {isExporting ? (
                <>Exporting...</>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}