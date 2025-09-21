import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, Music, CheckCircle, AlertCircle, Zap, Settings } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AudioFile = {
  id: string;
  file: File;
  name: string;
  size: number;
  duration?: number;
  format: string;
  quality: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  outputUrl?: string;
  waveformData?: number[];
};

type ProcessingOptions = {
  targetFormat: string;
  targetQuality: string;
  normalize: boolean;
  fadeIn: number;
  fadeOut: number;
  trimStart: number;
  trimEnd: number;
};

const AudioProcessor = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>({
    targetFormat: 'mp3',
    targetQuality: '320',
    normalize: true,
    fadeIn: 0,
    fadeOut: 0,
    trimStart: 0,
    trimEnd: 0
  });

  const supportedFormats = ['mp3', 'wav', 'flac', 'm4a', 'aac'];
  const qualityOptions = {
    mp3: ['128', '192', '256', '320'],
    wav: ['16bit', '24bit', '32bit'],
    flac: ['16bit', '24bit'],
    m4a: ['128', '192', '256', '320'],
    aac: ['128', '192', '256', '320']
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    selectedFiles.forEach(file => {
      if (!isAudioFile(file)) {
        toast({
          title: "Invalid File",
          description: `${file.name} is not a supported audio format.`,
          variant: "destructive"
        });
        return;
      }

      const audioFile: AudioFile = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        size: file.size,
        format: getFileFormat(file.name),
        quality: getFileQuality(file),
        status: 'pending',
        progress: 0
      };

      // Analyze audio file
      analyzeAudioFile(audioFile);
      
      setFiles(prev => [...prev, audioFile]);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isAudioFile = (file: File): boolean => {
    const audioTypes = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/m4a', 'audio/aac'];
    const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac'];
    
    return audioTypes.includes(file.type) || 
           audioExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  };

  const getFileFormat = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  };

  const getFileQuality = (file: File): string => {
    // In a real implementation, this would analyze the actual audio quality
    // For demo purposes, we'll estimate based on file size
    const sizePerMinute = file.size / 1024 / 1024; // MB per estimated minute
    
    if (sizePerMinute > 10) return 'High (320kbps+)';
    if (sizePerMinute > 5) return 'Medium (192-320kbps)';
    return 'Low (<192kbps)';
  };

  const analyzeAudioFile = (audioFile: AudioFile) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(audioFile.file);
    
    audio.addEventListener('loadedmetadata', () => {
      setFiles(prev => prev.map(f => 
        f.id === audioFile.id 
          ? { ...f, duration: audio.duration }
          : f
      ));
      
      // Generate mock waveform data
      const waveformData = Array.from({ length: 100 }, () => Math.random());
      setFiles(prev => prev.map(f => 
        f.id === audioFile.id 
          ? { ...f, waveformData }
          : f
      ));
      
      URL.revokeObjectURL(objectUrl);
    });
    
    audio.src = objectUrl;
  };

  const processAudio = async (audioFile: AudioFile) => {
    setFiles(prev => prev.map(f => 
      f.id === audioFile.id 
        ? { ...f, status: 'processing', progress: 0 }
        : f
    ));

    // Simulate processing with progress updates
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setFiles(prev => prev.map(f => 
        f.id === audioFile.id 
          ? { ...f, progress }
          : f
      ));
    }

    // Simulate processing completion
    const outputUrl = URL.createObjectURL(audioFile.file); // In real implementation, this would be the processed file
    
    setFiles(prev => prev.map(f => 
      f.id === audioFile.id 
        ? { 
            ...f, 
            status: 'completed', 
            progress: 100, 
            outputUrl,
            format: processingOptions.targetFormat,
            quality: `${processingOptions.targetQuality}kbps`
          }
        : f
    ));

    toast({
      title: "Processing Complete",
      description: `${audioFile.name} has been processed successfully.`
    });
  };

  const processAllFiles = async () => {
    setIsProcessing(true);
    
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    for (const file of pendingFiles) {
      await processAudio(file);
    }
    
    setIsProcessing(false);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const downloadFile = (audioFile: AudioFile) => {
    if (audioFile.outputUrl) {
      const link = document.createElement('a');
      link.href = audioFile.outputUrl;
      link.download = `processed_${audioFile.name}`;
      link.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Audio Processor
          </h2>
          <p className="text-muted-foreground">Upload, analyze, and process your audio files</p>
        </div>
        
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Files
          </Button>
          <Button 
            variant="hero"
            disabled={files.length === 0 || isProcessing}
            onClick={processAllFiles}
          >
            <Zap className="w-4 h-4 mr-2" />
            Process All
          </Button>
        </div>
      </div>

      {/* Processing Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Processing Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Target Format</label>
              <Select 
                value={processingOptions.targetFormat} 
                onValueChange={(value) => setProcessingOptions(prev => ({ ...prev, targetFormat: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedFormats.map(format => (
                    <SelectItem key={format} value={format}>
                      {format.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Quality</label>
              <Select 
                value={processingOptions.targetQuality} 
                onValueChange={(value) => setProcessingOptions(prev => ({ ...prev, targetQuality: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {qualityOptions[processingOptions.targetFormat as keyof typeof qualityOptions]?.map(quality => (
                    <SelectItem key={quality} value={quality}>
                      {quality}{processingOptions.targetFormat === 'mp3' ? 'kbps' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={processingOptions.normalize}
                onChange={(e) => setProcessingOptions(prev => ({ ...prev, normalize: e.target.checked }))}
              />
              <label className="text-sm font-medium">Normalize Audio</label>
            </div>

            <div>
              <label className="text-sm font-medium">Auto-trim Silence</label>
              <div className="flex gap-2 mt-1">
                <Button variant="outline" size="sm">Start</Button>
                <Button variant="outline" size="sm">End</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5" />
              Audio Files ({files.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {files.map((file) => (
                <div key={file.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {file.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {file.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                        {file.status === 'processing' && <Zap className="w-5 h-5 text-primary animate-pulse" />}
                        {file.status === 'pending' && <Music className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{formatFileSize(file.size)}</span>
                          {file.duration && <span>{formatDuration(file.duration)}</span>}
                          <Badge variant="outline">{file.format.toUpperCase()}</Badge>
                          <Badge variant="secondary">{file.quality}</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {file.status === 'completed' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadFile(file)}
                        >
                          Download
                        </Button>
                      )}
                      {file.status === 'pending' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => processAudio(file)}
                        >
                          Process
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeFile(file.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {file.status === 'processing' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Processing...</span>
                        <span>{file.progress}%</span>
                      </div>
                      <Progress value={file.progress} className="h-2" />
                    </div>
                  )}

                  {/* Waveform Preview */}
                  {file.waveformData && (
                    <div className="mt-3">
                      <p className="text-sm text-muted-foreground mb-2">Waveform:</p>
                      <div className="flex items-end gap-0.5 h-16 bg-muted rounded p-2">
                        {file.waveformData.slice(0, 50).map((value, index) => (
                          <div
                            key={index}
                            className="bg-primary rounded-t flex-1 min-w-0"
                            style={{ height: `${Math.max(2, value * 100)}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {files.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Audio Files</h3>
            <p className="text-muted-foreground mb-4">
              Upload audio files to get started with processing and analysis.
            </p>
            <Button 
              variant="hero"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Your First File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AudioProcessor;