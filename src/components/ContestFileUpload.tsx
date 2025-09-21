import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  X, 
  FileImage, 
  FileAudio, 
  File as FileIcon,
  Download
} from "lucide-react";

interface ContestFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  description?: string;
  is_downloadable: boolean;
}

interface ContestFileUploadProps {
  contestId?: string;
  fileType: 'cover' | 'resource' | 'gallery';
  onFilesUploaded: (files: ContestFile[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  existingFiles?: ContestFile[];
}

export const ContestFileUpload = ({
  contestId,
  fileType,
  onFilesUploaded,
  maxFiles = 5,
  acceptedTypes = ['image/*', 'audio/*'],
  existingFiles = []
}: ContestFileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState<ContestFile[]>(existingFiles);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!contestId && fileType !== 'cover') {
      toast({
        title: "Error",
        description: "Contest must be saved first before uploading files",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const uploadedFiles: ContestFile[] = [];
    const totalFiles = acceptedFiles.length;

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = contestId ? `${contestId}/${fileType}/${fileName}` : `temp/${fileType}/${fileName}`;

      try {
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('contests')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data } = supabase.storage
          .from('contests')
          .getPublicUrl(filePath);

        const fileData: ContestFile = {
          id: `temp_${Date.now()}_${i}`,
          file_name: file.name,
          file_url: data.publicUrl,
          file_type: file.type.startsWith('image/') ? 'image' : 
                    file.type.startsWith('audio/') ? 'audio' : 'other',
          file_size: file.size,
          is_downloadable: fileType === 'resource'
        };

        uploadedFiles.push(fileData);
        setUploadProgress(((i + 1) / totalFiles) * 100);
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive"
        });
      }
    }

    const newFiles = [...files, ...uploadedFiles];
    setFiles(newFiles);
    onFilesUploaded(newFiles);
    setUploading(false);
    setUploadProgress(0);

    if (uploadedFiles.length > 0) {
      toast({
        title: "Success",
        description: `Uploaded ${uploadedFiles.length} file(s) successfully`
      });
    }
  }, [contestId, fileType, files, onFilesUploaded, toast]);

  const removeFile = async (fileId: string) => {
    const fileToRemove = files.find(f => f.id === fileId);
    if (!fileToRemove) return;

    try {
      // Remove from storage if it's not a temp file
      if (!fileId.startsWith('temp_')) {
        const path = fileToRemove.file_url.split('/contests/')[1];
        if (path) {
          await supabase.storage.from('contests').remove([path]);
        }
      }

      const updatedFiles = files.filter(f => f.id !== fileId);
      setFiles(updatedFiles);
      onFilesUploaded(updatedFiles);

      toast({
        title: "File removed",
        description: "File has been removed successfully"
      });
    } catch (error) {
      console.error('Remove error:', error);
      toast({
        title: "Error",
        description: "Failed to remove file",
        variant: "destructive"
      });
    }
  };

  const updateFileDescription = (fileId: string, description: string) => {
    const updatedFiles = files.map(f => 
      f.id === fileId ? { ...f, description } : f
    );
    setFiles(updatedFiles);
    onFilesUploaded(updatedFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles: maxFiles - files.length,
    disabled: uploading || files.length >= maxFiles
  });

  const getFileIcon = (fileType: string) => {
    if (fileType === 'image') return <FileImage className="w-4 h-4" />;
    if (fileType === 'audio') return <FileAudio className="w-4 h-4" />;
    return <FileIcon className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {files.length < maxFiles && (
        <Card>
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                ${isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
                }
                ${uploading ? 'pointer-events-none opacity-50' : ''}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
              {uploading ? (
                <div className="space-y-2">
                  <p className="text-sm">Uploading...</p>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to select'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Accepts: {acceptedTypes.join(', ')} • Max {maxFiles} files
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((file) => (
            <Card key={file.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getFileIcon(file.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium truncate">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.is_downloadable && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(file.file_url, '_blank')}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeFile(file.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {fileType === 'resource' && (
                    <div className="space-y-1">
                      <Label htmlFor={`desc-${file.id}`} className="text-xs">
                        Description
                      </Label>
                      <Input
                        id={`desc-${file.id}`}
                        value={file.description || ''}
                        onChange={(e) => updateFileDescription(file.id, e.target.value)}
                        placeholder="File description..."
                        className="text-xs h-8"
                      />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {files.length >= maxFiles && (
        <p className="text-xs text-muted-foreground text-center">
          Maximum number of files reached ({maxFiles})
        </p>
      )}
    </div>
  );
};