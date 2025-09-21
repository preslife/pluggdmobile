import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Upload, Music, FileCheck, AlertCircle, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

type Track = {
  file: File;
  title: string;
  trackNumber: number;
  status: 'pending' | 'processing' | 'complete' | 'error';
  error?: string;
};

type AlbumMetadata = {
  title: string;
  artist: string;
  description: string;
  genre: string;
  releaseType: 'EP' | 'Album' | 'Mixtape';
  coverArt?: File;
};

const BulkReleaseUploader = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albumMetadata, setAlbumMetadata] = useState<AlbumMetadata>({
    title: '',
    artist: '',
    description: '',
    genre: '',
    releaseType: 'Album'
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const audioFiles = acceptedFiles.filter(file => 
      file.type.startsWith('audio/') || 
      file.name.toLowerCase().match(/\.(mp3|wav|flac|m4a|aac)$/i)
    );

    const newTracks: Track[] = audioFiles.map((file, index) => ({
      file,
      title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
      trackNumber: tracks.length + index + 1,
      status: 'pending'
    }));

    setTracks(prev => [...prev, ...newTracks]);
  }, [tracks.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.flac', '.m4a', '.aac']
    },
    multiple: true
  });

  const updateTrack = (index: number, updates: Partial<Track>) => {
    setTracks(prev => prev.map((track, i) => 
      i === index ? { ...track, ...updates } : track
    ));
  };

  const removeTrack = (index: number) => {
    setTracks(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAlbum = async () => {
    if (!user || tracks.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload process
      for (let i = 0; i < tracks.length; i++) {
        updateTrack(i, { status: 'processing' });
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate success/failure
        const success = Math.random() > 0.1; // 90% success rate
        
        if (success) {
          updateTrack(i, { status: 'complete' });
        } else {
          updateTrack(i, { 
            status: 'error', 
            error: 'Failed to process audio file' 
          });
        }
        
        setUploadProgress(((i + 1) / tracks.length) * 100);
      }

      toast({
        title: "Album Upload Complete!",
        description: `Successfully uploaded ${tracks.filter(t => t.status === 'complete').length} of ${tracks.length} tracks.`
      });

    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload album. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const reorderTracks = (fromIndex: number, toIndex: number) => {
    const newTracks = [...tracks];
    const [movedTrack] = newTracks.splice(fromIndex, 1);
    newTracks.splice(toIndex, 0, movedTrack);
    
    // Update track numbers
    newTracks.forEach((track, index) => {
      track.trackNumber = index + 1;
    });
    
    setTracks(newTracks);
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
        <p className="text-muted-foreground">Please sign in to upload albums.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Music className="w-6 h-6 text-primary" />
          Bulk Release Uploader
        </h2>
        <p className="text-muted-foreground">Upload multiple tracks as an album or EP</p>
      </div>

      {/* Album Metadata */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Album Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Album Title</label>
              <Input
                value={albumMetadata.title}
                onChange={(e) => setAlbumMetadata({...albumMetadata, title: e.target.value})}
                placeholder="Enter album title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Artist</label>
              <Input
                value={albumMetadata.artist}
                onChange={(e) => setAlbumMetadata({...albumMetadata, artist: e.target.value})}
                placeholder="Artist name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Genre</label>
              <Input
                value={albumMetadata.genre}
                onChange={(e) => setAlbumMetadata({...albumMetadata, genre: e.target.value})}
                placeholder="Genre"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Release Type</label>
              <select 
                className="w-full p-2 border rounded-md bg-background"
                value={albumMetadata.releaseType}
                onChange={(e) => setAlbumMetadata({...albumMetadata, releaseType: e.target.value as any})}
              >
                <option value="Album">Album</option>
                <option value="EP">EP</option>
                <option value="Mixtape">Mixtape</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={albumMetadata.description}
              onChange={(e) => setAlbumMetadata({...albumMetadata, description: e.target.value})}
              placeholder="Album description"
            />
          </div>
        </CardContent>
      </Card>

      {/* File Drop Zone */}
      <Card className="bg-gradient-card border-border">
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-lg">Drop the audio files here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drag & drop audio files here, or click to select</p>
                <p className="text-sm text-muted-foreground">Supports MP3, WAV, FLAC, M4A, AAC</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Track List */}
      {tracks.length > 0 && (
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle>Tracks ({tracks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tracks.map((track, index) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="text-sm font-medium w-8">{track.trackNumber}</div>
                  <div className="flex-1">
                    <Input
                      value={track.title}
                      onChange={(e) => updateTrack(index, { title: e.target.value })}
                      placeholder="Track title"
                      disabled={isUploading}
                    />
                    {track.error && (
                      <p className="text-xs text-destructive mt-1">{track.error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        track.status === 'complete' ? 'default' :
                        track.status === 'error' ? 'destructive' :
                        track.status === 'processing' ? 'secondary' : 'outline'
                      }
                    >
                      {track.status === 'complete' && <FileCheck className="w-3 h-3 mr-1" />}
                      {track.status === 'error' && <AlertCircle className="w-3 h-3 mr-1" />}
                      {track.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTrack(index)}
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <Card className="bg-gradient-card border-border">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Upload Progress</span>
                <span className="text-sm text-muted-foreground">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Button */}
      {tracks.length > 0 && (
        <div className="flex gap-4">
          <Button 
            onClick={uploadAlbum}
            disabled={isUploading || !albumMetadata.title || !albumMetadata.artist}
            variant="hero"
            className="flex-1"
          >
            {isUploading ? 'Uploading...' : `Upload ${albumMetadata.releaseType}`}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setTracks([])}
            disabled={isUploading}
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
};

export default BulkReleaseUploader;