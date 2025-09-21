import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/FileUpload";
import { Trash2, Plus, FileAudio } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface Track {
  id?: string;
  title: string;
  track_number: number;
  audio_url: string;
  duration?: number;
}

interface MultiTrackUploadProps {
  tracks: Track[];
  onTracksChange: (tracks: Track[]) => void;
  releaseType: string;
}

export const MultiTrackUpload = ({ tracks, onTracksChange, releaseType }: MultiTrackUploadProps) => {
  const { toast } = useToast();

  const addTrack = () => {
    const newTrack: Track = {
      title: '',
      track_number: tracks.length + 1,
      audio_url: ''
    };
    onTracksChange([...tracks, newTrack]);
  };

  const removeTrack = (index: number) => {
    const updatedTracks = tracks.filter((_, i) => i !== index).map((track, i) => ({
      ...track,
      track_number: i + 1
    }));
    onTracksChange(updatedTracks);
  };

  const updateTrack = (index: number, field: keyof Track, value: string | number) => {
    const updatedTracks = tracks.map((track, i) => 
      i === index ? { ...track, [field]: value } : track
    );
    onTracksChange(updatedTracks);
  };

  const handleAudioUpload = (index: number, url: string, fileName: string) => {
    updateTrack(index, 'audio_url', url);
    if (!tracks[index].title) {
      // Auto-fill title from filename if empty
      const titleFromFileName = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
      updateTrack(index, 'title', titleFromFileName);
    }
    toast({
      title: "Success",
      description: `Track ${index + 1} uploaded successfully`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">
          {releaseType} Tracks
        </Label>
        <Button type="button" onClick={addTrack} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Track
        </Button>
      </div>

      {tracks.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <FileAudio className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No tracks added yet. Click "Add Track" to start adding tracks to your {releaseType.toLowerCase()}.
            </p>
          </CardContent>
        </Card>
      )}

      {tracks.map((track, index) => (
        <Card key={index}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Track {track.track_number}
              </CardTitle>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeTrack(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor={`track-title-${index}`}>Track Title</Label>
              <Input
                id={`track-title-${index}`}
                placeholder="Enter track title"
                value={track.title}
                onChange={(e) => updateTrack(index, 'title', e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Audio File</Label>
              <FileUpload
                accept="audio/*"
                bucketName="audio-files"
                maxSizeMB={80}
                onUpload={(url, fileName) => handleAudioUpload(index, url, fileName)}
              />
              {track.audio_url && (
                <div className="mt-2">
                  <Label htmlFor={`track-url-${index}`}>Audio URL</Label>
                  <Input
                    id={`track-url-${index}`}
                    value={track.audio_url}
                    onChange={(e) => updateTrack(index, 'audio_url', e.target.value)}
                    placeholder="Audio file URL"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};