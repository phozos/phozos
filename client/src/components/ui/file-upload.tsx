import React, { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Upload, X, File, FileText, Image } from "lucide-react";
import { Button } from "./button";

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  className?: string;
  multiple?: boolean;
}

interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
}

export function FileUpload({
  onFilesSelect,
  maxFiles = 5,
  maxSize = 10, // 10MB default
  acceptedTypes = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"],
  className,
  multiple = true
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string>("");

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File "${file.name}" is too large. Maximum size is ${maxSize}MB.`);
      return false;
    }

    // Check file type
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      setError(`File type "${fileExtension}" is not supported.`);
      return false;
    }

    return true;
  };

  const handleFiles = useCallback((files: FileList) => {
    setError("");
    const fileArray = Array.from(files);
    
    if (!multiple && fileArray.length > 1) {
      setError("Only one file is allowed.");
      return;
    }

    if (uploadedFiles.length + fileArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed.`);
      return;
    }

    const validFiles: UploadedFile[] = [];

    fileArray.forEach(file => {
      if (validateFile(file)) {
        const uploadedFile: UploadedFile = {
          file,
          id: Math.random().toString(36).substring(7),
        };

        // Create preview for images
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (e) => {
            uploadedFile.preview = e.target?.result as string;
            setUploadedFiles(prev => 
              prev.map(f => f.id === uploadedFile.id ? uploadedFile : f)
            );
          };
          reader.readAsDataURL(file);
        }

        validFiles.push(uploadedFile);
      }
    });

    if (validFiles.length > 0) {
      const newFiles = [...uploadedFiles, ...validFiles];
      setUploadedFiles(newFiles);
      onFilesSelect(newFiles.map(f => f.file));
    }
  }, [uploadedFiles, maxFiles, multiple, onFilesSelect, maxSize, acceptedTypes]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeFile = (id: string) => {
    const newFiles = uploadedFiles.filter(f => f.id !== id);
    setUploadedFiles(newFiles);
    onFilesSelect(newFiles.map(f => f.file));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <Image className="w-6 h-6" />;
    if (file.type.includes("pdf")) return <FileText className="w-6 h-6" />;
    return <File className="w-6 h-6" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "file-upload-zone rounded-xl p-8 text-center transition-all duration-300 cursor-pointer",
          "border-2 border-dashed border-border hover:border-primary",
          "bg-muted/50 hover:bg-primary/5",
          isDragOver && "border-primary bg-primary/10 scale-105"
        )}
      >
        <input
          type="file"
          multiple={multiple}
          accept={acceptedTypes.join(",")}
          onChange={handleInputChange}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Drag & drop your files here
              </h3>
              <p className="text-muted-foreground mb-4">or click to browse</p>
              <Button type="button" variant="outline">
                Choose Files
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Supports {acceptedTypes.join(", ")} (Max {maxSize}MB each)
            </p>
          </div>
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Uploaded Files ({uploadedFiles.length})</h4>
          <div className="space-y-2">
            {uploadedFiles.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="flex items-center space-x-3 p-3 bg-card border border-border rounded-lg"
              >
                {uploadedFile.preview ? (
                  <img
                    src={uploadedFile.preview}
                    alt={uploadedFile.file.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center text-muted-foreground">
                    {getFileIcon(uploadedFile.file)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(uploadedFile.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
