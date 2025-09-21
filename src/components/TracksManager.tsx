import { useState, useEffect } from "react";
import { Plus, Upload, Music, Trash2, Edit, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Track {
  id: string;
  title: string;
  duration: number;
  audio_url: string;
  track_number: number;
  play_count?: number;
}

interface TracksManagerProps {
  releaseId: string;
  tracks: Track[];
  onTracksUpdate: (tracks: Track[]) => void;
  canEdit: boolean;
}

export const TracksManager = ({ releaseId, tracks, onTracksUpdate, canEdit }: TracksManagerProps) => {
  const [isAddingTrack, setIsAddingTrack] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});

  const [newTrack, setNewTrack] = useState({
    title: "",
    track_number: tracks.length + 1,
    duration: 0,
    audio_file: null as File | null
  });

  useEffect(() => {
    return () => {
      // Cleanup audio elements
      Object.values(audioElements).forEach(audio => {
        audio.pause();
        audio.remove();
      });
    };
  }, [audioElements]);

  const handleFileSelect = (file: File) => {
    setNewTrack(prev => ({ ...prev, audio_file: file }));
    
    // Create audio element to get duration
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    audio.addEventListener('loadedmetadata', () => {
      setNewTrack(prev => ({ ...prev, duration: Math.round(audio.duration) }));
      URL.revokeObjectURL(audio.src);
    });
  };

  const uploadAudioFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `tracks/${releaseId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('release-audio')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('release-audio')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleAddTrack = async () => {
    if (!newTrack.title.trim() || !newTrack.audio_file) {
      toast.error("Please provide both title and audio file");
      return;
    }

    setIsUploading(true);
    try {
      // Upload audio file
      const audioUrl = await uploadAudioFile(newTrack.audio_file);

      // Create track record
      const { data, error } = await supabase
        .from('tracks')
        .insert({
          release_id: releaseId,
          title: newTrack.title,
          track_number: newTrack.track_number,
          duration: newTrack.duration,
          audio_url: audioUrl
        })
        .select()
        .single();

      if (error) throw error;

      const updatedTracks = [...tracks, data].sort((a, b) => a.track_number - b.track_number);
      onTracksUpdate(updatedTracks);
      
      setNewTrack({
        title: "",
        track_number: tracks.length + 2,
        duration: 0,
        audio_file: null
      });
      setIsAddingTrack(false);
      toast.success("Track added successfully");
    } catch (error) {
      console.error('Error adding track:', error);
      toast.error("Failed to add track");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    try {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

      if (error) throw error;

      const updatedTracks = tracks.filter(t => t.id !== trackId);
      onTracksUpdate(updatedTracks);
      toast.success("Track deleted successfully");
    } catch (error) {
      console.error('Error deleting track:', error);
      toast.error("Failed to delete track");
    }
  };

  const handleUpdateTrack = async () => {
    if (!editingTrack || !editingTrack.title.trim()) {
      toast.error("Please provide a title");
      return;
    }

    try {
      const { error } = await supabase
        .from('tracks')
        .update({
          title: editingTrack.title,
          track_number: editingTrack.track_number
        })
        .eq('id', editingTrack.id);

      if (error) throw error;

      const updatedTracks = tracks.map(t => 
        t.id === editingTrack.id ? editingTrack : t
      ).sort((a, b) => a.track_number - b.track_number);
      
      onTracksUpdate(updatedTracks);
      setEditingTrack(null);
      toast.success("Track updated successfully");
    } catch (error) {
      console.error('Error updating track:', error);
      toast.error("Failed to update track");
    }
  };

  const togglePlay = (track: Track) => {
    const currentAudio = audioElements[track.id];
    
    if (currentlyPlaying === track.id) {
      currentAudio?.pause();
      setCurrentlyPlaying(null);
    } else {
      // Pause any currently playing audio
      if (currentlyPlaying && audioElements[currentlyPlaying]) {
        audioElements[currentlyPlaying].pause();
      }
      
      if (currentAudio) {
        currentAudio.play();
      } else {
        // Create new audio element
        const audio = new Audio(track.audio_url);
        audio.addEventListener('ended', () => setCurrentlyPlaying(null));
        audio.addEventListener('error', () => {
          toast.error("Error playing track");
          setCurrentlyPlaying(null);
        });
        
        setAudioElements(prev => ({ ...prev, [track.id]: audio }));
        audio.play();
      }
      setCurrentlyPlaying(track.id);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Tracks ({tracks.length})
        </CardTitle>
        {canEdit && (
          <Dialog open={isAddingTrack} onOpenChange={setIsAddingTrack}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Track
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Track</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="track-title">Track Title</Label>
                  <Input
                    id="track-title"
                    value={newTrack.title}
                    onChange={(e) => setNewTrack(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter track title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="track-number">Track Number</Label>
                  <Input
                    id="track-number"
                    type="number"
                    min="1"
                    value={newTrack.track_number}
                    onChange={(e) => setNewTrack(prev => ({ ...prev, track_number: parseInt(e.target.value) || 1 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="audio-file">Audio File</Label>
                  <Input
                    id="audio-file"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                  {newTrack.duration > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Duration: {formatDuration(newTrack.duration)}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleAddTrack} disabled={isUploading} className="flex-1">
                    {isUploading ? (
                      <>
                        <Upload className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Track
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddingTrack(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {tracks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tracks added yet</p>
            {canEdit && (
              <p className="text-sm">Click "Add Track" to get started</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {tracks.sort((a, b) => a.track_number - b.track_number).map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium w-8 text-center">
                  {track.track_number}
                </span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePlay(track)}
                  className="h-8 w-8 p-0"
                >
                  {currentlyPlaying === track.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{track.title}</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatDuration(track.duration || 0)}</span>
                    {track.play_count !== undefined && (
                      <span>{track.play_count.toLocaleString()} plays</span>
                    )}
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-2">
                    <Dialog 
                      open={editingTrack?.id === track.id} 
                      onOpenChange={(open) => !open && setEditingTrack(null)}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTrack(track)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Edit Track</DialogTitle>
                        </DialogHeader>
                        {editingTrack && (
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="edit-title">Track Title</Label>
                              <Input
                                id="edit-title"
                                value={editingTrack.title}
                                onChange={(e) => setEditingTrack(prev => 
                                  prev ? { ...prev, title: e.target.value } : null
                                )}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-number">Track Number</Label>
                              <Input
                                id="edit-number"
                                type="number"
                                min="1"
                                value={editingTrack.track_number}
                                onChange={(e) => setEditingTrack(prev => 
                                  prev ? { ...prev, track_number: parseInt(e.target.value) || 1 } : null
                                )}
                              />
                            </div>
                            <div className="flex gap-2 pt-4">
                              <Button onClick={handleUpdateTrack} className="flex-1">
                                Update Track
                              </Button>
                              <Button variant="outline" onClick={() => setEditingTrack(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Track</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{track.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteTrack(track.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};