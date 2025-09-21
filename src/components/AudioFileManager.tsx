import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Download, Play, Pause, Music, FileAudio, HardDrive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StreamingAudioPlayer } from './StreamingAudioPlayer';

interface AudioFile {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  stream_url?: string;
  duration_seconds?: number;
  processing_status: string;
  created_at: string;
}

interface AudioFileManagerProps {
  showUploadQuota?: boolean;
  allowDelete?: boolean;
  onFileSelect?: (audioFile: AudioFile) => void;
  className?: string;
}

export const AudioFileManager = ({
  showUploadQuota = true,
  allowDelete = true,
  onFileSelect,
  className = ''
}: AudioFileManagerProps) => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [quota, setQuota] = useState<any>(null);
  const [limits, setLimits] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchAudioFiles();
      if (showUploadQuota) {
        fetchQuotaAndLimits();
      }
    }
  }, [user, showUploadQuota]);

  const fetchAudioFiles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('audio_files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAudioFiles(data || []);
    } catch (error) {
      console.error('Error fetching audio files:', error);
      toast({
        title: "Error",
        description: "Failed to load audio files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotaAndLimits = async () => {
    if (!user) return;

    try {
      // Fetch current quota
      const { data: quotaData } = await supabase
        .from('user_file_quotas')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setQuota(quotaData);

      // Fetch user limits
      const { data: limitsData } = await supabase
        .rpc('get_user_file_limits', { p_user_id: user.id });

      setLimits(limitsData);
    } catch (error) {
      console.error('Error fetching quota and limits:', error);
    }
  };

  const deleteAudioFile = async (audioFile: AudioFile) => {
    if (!user) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('audio-files')
        .remove([audioFile.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('audio_files')
        .delete()
        .eq('id', audioFile.id);

      if (dbError) throw dbError;

      // Update local state
      setAudioFiles(prev => prev.filter(f => f.id !== audioFile.id));

      // Update quotas
      if (quota) {
        setQuota(prev => ({
          ...prev,
          total_storage_used: prev.total_storage_used - audioFile.file_size
        }));
      }

      toast({
        title: "File deleted",
        description: `${audioFile.file_name} has been deleted`,
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete audio file",
        variant: "destructive",
      });
    }
  };

  const downloadAudioFile = async (audioFile: AudioFile) => {
    if (!audioFile.stream_url) return;

    try {
      const response = await fetch(audioFile.stream_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = audioFile.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download started",
        description: `Downloading ${audioFile.file_name}`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download audio file",
        variant: "destructive",
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleFileSelect = (audioFile: AudioFile) => {
    if (audioFile.processing_status === 'completed') {
      setSelectedFile(selectedFile === audioFile.id ? null : audioFile.id);
      onFileSelect?.(audioFile);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Quota Display */}
      {showUploadQuota && quota && limits && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <HardDrive className="h-5 w-5" />
              Storage Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Files</p>
                <p className="font-medium text-lg">{audioFiles.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Storage Used</p>
                <p className="font-medium text-lg">
                  {formatBytes(quota.total_storage_used)} / {limits.total_storage_limit_mb === -1 ? '∞' : `${limits.total_storage_limit_mb}MB`}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Monthly Uploads</p>
                <p className="font-medium text-lg">
                  {quota.monthly_uploads_count} / {limits.monthly_upload_limit_count === -1 ? '∞' : limits.monthly_upload_limit_count}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audio Files List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Audio Files ({audioFiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {audioFiles.length === 0 ? (
            <div className="text-center py-8">
              <FileAudio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No audio files uploaded yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {audioFiles.map(audioFile => (
                <div key={audioFile.id} className="space-y-2">
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div 
                            className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                            onClick={() => handleFileSelect(audioFile)}
                          >
                            {selectedFile === audioFile.id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                            <FileAudio className="h-4 w-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{audioFile.file_name}</h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatBytes(audioFile.file_size)}</span>
                              <span>•</span>
                              <span>{formatDuration(audioFile.duration_seconds)}</span>
                              <span>•</span>
                              <Badge variant={getStatusColor(audioFile.processing_status)} className="text-xs">
                                {audioFile.processing_status}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadAudioFile(audioFile)}
                            className="h-8 w-8 p-0"
                            disabled={!audioFile.stream_url}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          
                          {allowDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteAudioFile(audioFile)}
                              className="h-8 w-8 p-0 hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Audio Player */}
                  {selectedFile === audioFile.id && audioFile.stream_url && (
                    <StreamingAudioPlayer
                      audioFileId={audioFile.id}
                      streamUrl={audioFile.stream_url}
                      title={audioFile.file_name}
                      duration={audioFile.duration_seconds}
                      allowDownload={true}
                      className="ml-6"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};