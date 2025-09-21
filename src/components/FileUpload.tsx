import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, FileAudio, Image, Archive } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';

interface FileUploadProps {
  onUpload: (url: string, fileName: string) => void;
  accept: string;
  bucketName: 'audio-files' | 'beat-artwork' | 'course-audio';
  maxSizeMB?: number;
  className?: string;
  children?: React.ReactNode;
  allowMultiple?: boolean; // For stems upload
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  accept,
  bucketName,
  maxSizeMB = 100,
  className = '',
  children,
  allowMultiple = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    console.log('File validation:', {
      fileName: file.name,
      fileSize: file.size,
      fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
      maxSizeMB,
      maxSizeBytes: maxSizeMB * 1024 * 1024
    });
    
    // Enforce 100MB max for audio files regardless of provided max
    const isAudio = file.type.startsWith('audio/') || /\.(wav|mp3|m4a|aac|flac|ogg)$/i.test(file.name);
    const effectiveMaxMB = isAudio ? Math.min(maxSizeMB, 100) : maxSizeMB;

    // Check file size
    if (file.size > effectiveMaxMB * 1024 * 1024) {
      console.error('File too large:', file.size, 'vs max:', effectiveMaxMB * 1024 * 1024);
      return `File size must be less than ${effectiveMaxMB}MB`;
    }

    // Check file type
    const allowedTypes = accept.split(',').map(type => type.trim());
    const isValidType = allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type);
      }
      return file.type.startsWith(type.replace('*', ''));
    });

    if (!isValidType) {
      return `File type not supported. Allowed types: ${accept}`;
    }

    return null;
  };

  const createZipFromFiles = async (files: File[]): Promise<File> => {
    const zip = new JSZip();
    
    setZipProgress(0);
    
    files.forEach((file) => {
      zip.file(file.name, file);
    });
    
    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    }, (metadata) => {
      setZipProgress(metadata.percent);
    });
    
    const timestamp = Date.now();
    const zipFile = new File([zipBlob], `stems-${timestamp}.zip`, { type: 'application/zip' });
    return zipFile;
  };

  const processFiles = async (files: FileList | File[]) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload files",
        variant: "destructive"
      });
      return;
    }

    const fileArray = Array.from(files);
    
    // Check if multiple audio files for stems auto-zipping
    const isAudioFiles = fileArray.every(file => file.type.startsWith('audio/'));
    const hasMultipleFiles = fileArray.length > 1;
    
    if (hasMultipleFiles && isAudioFiles && allowMultiple) {
      // Multiple audio files - create ZIP
      setSelectedFiles(fileArray);
      
      toast({
        title: "Creating ZIP file",
        description: `Preparing ${fileArray.length} audio files for upload...`
      });
      
      try {
        const zipFile = await createZipFromFiles(fileArray);
        await uploadFile(zipFile);
        setSelectedFiles([]);
      } catch (error: any) {
        toast({
          title: "ZIP creation failed",
          description: error.message || "Failed to create ZIP file",
          variant: "destructive"
        });
      }
    } else {
      // Single file or regular upload
      const file = fileArray[0];
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: "Invalid file",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Create unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${user.id}/${timestamp}-${sanitizedName}`;

      console.log('Uploading file:', {
        fileName,
        fileSize: file.size,
        bucketName
      });

      // Upload to Supabase Storage with progress simulation
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file);

      // Upload completed
      
      if (error) {
        console.error('Detailed Supabase error:', {
          message: error.message,
          fullError: error
        });
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 100);

      if (error) {
        clearInterval(progressInterval);
        throw error;
      }

      // Get the public URL
      let publicUrl;
      if (bucketName === 'beat-artwork' || bucketName === 'course-audio') {
        // Public bucket - get public URL
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
      } else {
        // Private bucket - get signed URL (valid for 1 year)
        const { data: urlData, error: urlError } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(fileName, 365 * 24 * 60 * 60); // 1 year

        if (urlError) {
          throw urlError;
        }
        publicUrl = urlData.signedUrl;
      }

      onUpload(publicUrl, file.name);
      
      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded successfully`
      });

    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setProgress(0);
      setZipProgress(0);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    fileInputRef.current?.click();
  };

  const isAudioUpload = bucketName === 'audio-files';

  return (
    <Card className={`border-2 border-dashed transition-colors ${
      dragActive ? 'border-primary bg-primary/5' : 'border-border'
    } ${className}`}>
      <CardContent 
        className="p-6 text-center"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
          id="file-upload-input"
          name="file-upload"
          aria-label="Upload file"
          multiple={allowMultiple}
        />

        {uploading || selectedFiles.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              {selectedFiles.length > 0 ? (
                <Archive className="w-8 h-8 text-primary animate-pulse" />
              ) : (
                <Upload className="w-8 h-8 text-primary animate-pulse" />
              )}
            </div>
            
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Creating ZIP from {selectedFiles.length} files...</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="truncate">• {file.name}</div>
                  ))}
                </div>
                <Progress value={zipProgress} className="w-full" />
                <p className="text-xs text-muted-foreground">{Math.round(zipProgress)}%</p>
              </div>
            )}
            
            {uploading && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Uploading...</p>
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-muted-foreground">{Math.round(progress)}%</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              {isAudioUpload ? (
                <FileAudio className="w-12 h-12 text-muted-foreground" />
              ) : (
                <Image className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
            
            {children || (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Drop {isAudioUpload ? 'audio files' : 'images'} here or click to upload
                </p>
                <p className="text-xs text-muted-foreground">
                  {accept} • Max {isAudioUpload ? Math.min(maxSizeMB, 50) : maxSizeMB}MB
                </p>
              </div>
            )}
            
            <Button
              variant="outline"
              onClick={handleButtonClick}
              disabled={uploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};