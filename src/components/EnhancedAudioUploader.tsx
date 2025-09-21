import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, Music, AlertCircle, CheckCircle, X, FileAudio } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';

interface FileQuota {
  total_storage_used: number;
  monthly_uploads_count: number;
  monthly_uploads_size: number;
}

interface FileLimits {
  max_file_size_mb: number;
  monthly_upload_limit_count: number;
  monthly_upload_limit_mb: number;
  total_storage_limit_mb: number;
  allowed_formats: string[];
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  audioFileId?: string;
}

export const EnhancedAudioUploader = ({ onUploadComplete }: { onUploadComplete?: (audioFileId: string) => void }) => {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [quota, setQuota] = useState<FileQuota | null>(null);
  const [limits, setLimits] = useState<FileLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchQuotaAndLimits();
    }
  }, [user]);

  const fetchQuotaAndLimits = async () => {
    if (!user) return;

    try {
      // Fetch current quota
      const { data: quotaData, error: quotaError } = await supabase
        .from('user_file_quotas')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (quotaError && quotaError.code !== 'PGRST116') {
        throw quotaError;
      }

      setQuota(quotaData || {
        total_storage_used: 0,
        monthly_uploads_count: 0,
        monthly_uploads_size: 0
      });

      // Fetch user limits
      const { data: limitsData, error: limitsError } = await supabase
        .rpc('get_user_file_limits', { p_user_id: user.id });

      if (limitsError) throw limitsError;
      setLimits(limitsData as unknown as FileLimits);
    } catch (error) {
      console.error('Error fetching quota and limits:', error);
      toast({
        title: "Error",
        description: "Failed to load upload limits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file: File): string | null => {
    if (!limits) return "Upload limits not loaded";

    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !limits.allowed_formats.includes(fileExtension)) {
      return `File type .${fileExtension} not allowed. Allowed: ${limits.allowed_formats.join(', ')}`;
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > limits.max_file_size_mb) {
      return `File too large. Max size: ${limits.max_file_size_mb}MB`;
    }

    // Check monthly limits
    if (limits.monthly_upload_limit_count !== -1 && 
        quota && quota.monthly_uploads_count >= limits.monthly_upload_limit_count) {
      return "Monthly upload limit reached";
    }

    if (limits.monthly_upload_limit_mb !== -1 && quota &&
        (quota.monthly_uploads_size + file.size) / (1024 * 1024) > limits.monthly_upload_limit_mb) {
      return "Monthly upload size limit would be exceeded";
    }

    // Check total storage
    if (limits.total_storage_limit_mb !== -1 && quota &&
        (quota.total_storage_used + file.size) / (1024 * 1024) > limits.total_storage_limit_mb) {
      return "Total storage limit would be exceeded";
    }

    return null;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploadFiles: UploadFile[] = acceptedFiles.map(file => {
      const validation = validateFile(file);
      return {
        file,
        id: crypto.randomUUID(),
        progress: 0,
        status: validation ? 'error' : 'pending',
        error: validation || undefined
      };
    });

    setUploadFiles(prev => [...prev, ...newUploadFiles]);

    // Start uploading valid files
    newUploadFiles
      .filter(uploadFile => uploadFile.status === 'pending')
      .forEach(uploadFile => uploadAudioFile(uploadFile));
  }, [limits, quota]);

  const uploadAudioFile = async (uploadFile: UploadFile) => {
    if (!user) return;

    try {
      // Update status to uploading
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading' } : f
      ));

      // Generate unique file path
      const fileExtension = uploadFile.file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

      // Upload to Supabase storage with progress tracking
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(fileName, uploadFile.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Update status to processing
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'processing', progress: 100 } : f
      ));

      // Create audio file record
      const { data: audioFileData, error: dbError } = await supabase
        .from('audio_files')
        .insert({
          user_id: user.id,
          file_name: uploadFile.file.name,
          file_size: uploadFile.file.size,
          file_type: uploadFile.file.type,
          storage_path: fileName,
          stream_url: supabase.storage.from('audio-files').getPublicUrl(fileName).data.publicUrl,
          processing_status: 'completed'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Update file quotas
      await supabase.rpc('update_file_quotas', {
        p_user_id: user.id,
        p_file_size: uploadFile.file.size
      });

      // Update status to completed
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { 
          ...f, 
          status: 'completed', 
          audioFileId: audioFileData.id 
        } : f
      ));

      // Refresh quota
      fetchQuotaAndLimits();

      // Notify completion
      if (onUploadComplete) {
        onUploadComplete(audioFileData.id);
      }

      toast({
        title: "Upload successful",
        description: `${uploadFile.file.name} uploaded successfully`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { 
          ...f, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed' 
        } : f
      ));

      toast({
        title: "Upload failed",
        description: `Failed to upload ${uploadFile.file.name}`,
        variant: "destructive",
      });
    }
  };

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.flac', '.aiff', '.m4a']
    },
    multiple: true
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quota Display */}
      {quota && limits && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Upload Quota</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Monthly Uploads</p>
                <p className="font-medium">
                  {quota.monthly_uploads_count} / {limits.monthly_upload_limit_count === -1 ? '∞' : limits.monthly_upload_limit_count}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Monthly Size</p>
                <p className="font-medium">
                  {formatBytes(quota.monthly_uploads_size)} / {limits.monthly_upload_limit_mb === -1 ? '∞' : `${limits.monthly_upload_limit_mb}MB`}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Storage</p>
                <p className="font-medium">
                  {formatBytes(quota.total_storage_used)} / {limits.total_storage_limit_mb === -1 ? '∞' : `${limits.total_storage_limit_mb}MB`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary hover:bg-primary/5'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {isDragActive ? 'Drop audio files here' : 'Upload Audio Files'}
            </h3>
            <p className="text-muted-foreground mb-4">
              Drag & drop audio files or click to browse
            </p>
            {limits && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Supported formats: {limits.allowed_formats.join(', ')}</p>
                <p>Max file size: {limits.max_file_size_mb}MB</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileAudio className="h-5 w-5" />
              Upload Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadFiles.map(uploadFile => (
              <div key={uploadFile.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    <span className="text-sm font-medium">{uploadFile.file.name}</span>
                    <Badge variant={
                      uploadFile.status === 'completed' ? 'default' :
                      uploadFile.status === 'error' ? 'destructive' :
                      uploadFile.status === 'processing' ? 'secondary' : 'outline'
                    }>
                      {uploadFile.status}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(uploadFile.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                
                {uploadFile.status === 'uploading' && (
                  <Progress value={uploadFile.progress} className="w-full" />
                )}
                
                {uploadFile.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{uploadFile.error}</AlertDescription>
                  </Alert>
                )}
                
                {uploadFile.status === 'completed' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>Upload completed successfully</AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};