import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Upload, 
  Image as ImageIcon, 
  Music, 
  X, 
  FileText,
  Check
} from "lucide-react";

interface MediaFile {
  id: string;
  name: string;
  type: 'image' | 'audio';
  url: string;
  size: number;
}

interface MediaUploaderProps {
  onFilesUploaded: (files: MediaFile[]) => void;
  allowedTypes?: ('image' | 'audio')[];
  maxFiles?: number;
  bucketName: string;
}

export function MediaUploader({ 
  onFilesUploaded, 
  allowedTypes = ['image', 'audio'],
  maxFiles = 5,
  bucketName
}: MediaUploaderProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    // Validate file types
    const validFiles = selectedFiles.filter(file => {
      const type = file.type.startsWith('image/') ? 'image' : 
                  file.type.startsWith('audio/') ? 'audio' : null;
      
      if (!type || !allowedTypes.includes(type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type`,
          variant: "destructive",
        });
        return false;
      }

      // Check file size (10MB images, 50MB audio)
      const maxMB = type === 'audio' ? 50 : 10;
      if (file.size > maxMB * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds ${maxMB}MB limit`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    });

    if (files.length + validFiles.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "destructive",
      });
      return;
    }

    uploadFiles(validFiles);
  };

  const uploadFiles = async (filesToUpload: File[]) => {
    if (filesToUpload.length === 0) return;
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload files",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const uploadedFiles: MediaFile[] = [];

    for (const file of filesToUpload) {
      try {
        const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // Sanitize filename and use user-specific folder structure for RLS policies
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = user ? `${user.id}/${fileId}-${sanitizedFileName}` : `${fileId}-${sanitizedFileName}`;
        
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);

        const mediaFile: MediaFile = {
          id: fileId,
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : 'audio',
          url: publicUrl,
          size: file.size
        };

        uploadedFiles.push(mediaFile);
        setFiles(prev => [...prev, mediaFile]);
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

        toast({
          title: "Upload successful",
          description: `${file.name} uploaded successfully`,
        });
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive",
        });
      }
    }

    setUploading(false);
    if (uploadedFiles.length > 0) {
      onFilesUploaded(uploadedFiles);
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    try {
      // Extract filename from URL
      const fileName = file.url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from(bucketName)
          .remove([fileName]);
      }

      setFiles(prev => prev.filter(f => f.id !== fileId));
      
      toast({
        title: "File removed",
        description: `${file.name} has been deleted`,
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: `Failed to delete ${file.name}`,
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-blue-500" />;
      case 'audio':
        return <Music className="w-5 h-5 text-green-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center bg-gradient-to-br from-muted/20 to-card/30 hover:border-primary/50 transition-colors">
        <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2">Upload Media Files</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Drag and drop files here, or click to browse
          <br />
          Supported: {allowedTypes.includes('image') && 'Images'} 
          {allowedTypes.includes('image') && allowedTypes.includes('audio') && ' & '}
          {allowedTypes.includes('audio') && 'Audio files'} (Max 10MB images / 50MB audio)
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={
            allowedTypes.includes('image') && allowedTypes.includes('audio') 
              ? "image/*,audio/*"
              : allowedTypes.includes('image') 
                ? "image/*" 
                : "audio/*"
          }
          onChange={handleFileSelect}
          className="hidden"
        />

        <Button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            fileInputRef.current?.click();
          }}
          disabled={uploading || files.length >= maxFiles}
          className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
        >
          <Upload className="w-4 h-4 mr-2" />
          Choose Files
        </Button>
        
        <p className="text-xs text-muted-foreground mt-2">
          {files.length}/{maxFiles} files uploaded
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Uploaded Files:</h4>
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 bg-card/50 rounded-lg border border-border/30"
            >
              {getFileIcon(file.type)}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)} • {file.type}
                </p>
                
                {uploadProgress[file.id] !== undefined && uploadProgress[file.id] < 100 && (
                  <Progress value={uploadProgress[file.id]} className="mt-2 h-1" />
                )}
              </div>

              {uploadProgress[file.id] === 100 && (
                <Check className="w-4 h-4 text-green-500" />
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(file.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}