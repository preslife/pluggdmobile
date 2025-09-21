import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Video {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  thumbnail_url?: string;
  artist_id?: string;
  is_featured: boolean;
  created_at: string;
}

interface Artist {
  id: string;
  name: string;
}

export const AdminVideoManager = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const { toast } = useToast();

  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    youtube_url: '',
    thumbnail_url: '',
    artist_id: '',
    is_featured: false,
    video_file: null as File | null
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [videosRes, artistsRes] = await Promise.all([
        supabase.from('videos').select('*').order('created_at', { ascending: false }),
        supabase.from('artists').select('id, name').order('name')
      ]);

      if (videosRes.error) throw videosRes.error;
      if (artistsRes.error) throw artistsRes.error;

      setVideos(videosRes.data || []);
      setArtists(artistsRes.data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `videos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let videoUrl = videoForm.youtube_url;
      
      // If video file is uploaded, upload it and get URL
      if (videoForm.video_file) {
        videoUrl = await handleFileUpload(videoForm.video_file);
      }

      const videoData = {
        title: videoForm.title,
        description: videoForm.description,
        youtube_url: videoUrl,
        thumbnail_url: videoForm.thumbnail_url,
        artist_id: videoForm.artist_id || null,
        is_featured: videoForm.is_featured
      };

      if (editingVideo) {
        const { error } = await supabase
          .from('videos')
          .update(videoData)
          .eq('id', editingVideo.id);
        if (error) throw error;
        toast({ title: "Success", description: "Video updated successfully" });
      } else {
        const { error } = await supabase
          .from('videos')
          .insert([videoData]);
        if (error) throw error;
        toast({ title: "Success", description: "Video created successfully" });
      }

      resetForm();
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save video",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setVideoForm({
      title: '',
      description: '',
      youtube_url: '',
      thumbnail_url: '',
      artist_id: '',
      is_featured: false,
      video_file: null
    });
    setEditingVideo(null);
  };

  const editVideo = (video: Video) => {
    setEditingVideo(video);
    setVideoForm({
      title: video.title,
      description: video.description || '',
      youtube_url: video.youtube_url,
      thumbnail_url: video.thumbnail_url || '',
      artist_id: video.artist_id || '',
      is_featured: video.is_featured,
      video_file: null
    });
    setDialogOpen(true);
  };

  const deleteVideo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Video deleted successfully" });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete video",
        variant: "destructive",
      });
    }
  };

  const getArtistName = (artistId?: string) => {
    if (!artistId) return 'No Artist';
    const artist = artists.find(a => a.id === artistId);
    return artist ? artist.name.charAt(0).toUpperCase() + artist.name.slice(1).toLowerCase() : "Unknown Artist";
  };

  if (loading) {
    return <div>Loading videos...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Manage Videos
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Video
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingVideo ? 'Edit Video' : 'Add New Video'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={videoForm.title}
                      onChange={(e) => setVideoForm({...videoForm, title: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="artist_id">Artist</Label>
                    <Select value={videoForm.artist_id || "none"} onValueChange={(value) => setVideoForm({...videoForm, artist_id: value === "none" ? "" : value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an artist" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Artist</SelectItem>
                        {artists.map((artist) => (
                          <SelectItem key={artist.id} value={artist.id}>
                            {artist.name.charAt(0).toUpperCase() + artist.name.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={videoForm.description}
                    onChange={(e) => setVideoForm({...videoForm, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="youtube_url">YouTube URL (Optional if uploading file)</Label>
                    <Input
                      id="youtube_url"
                      value={videoForm.youtube_url}
                      onChange={(e) => setVideoForm({...videoForm, youtube_url: e.target.value})}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="video_file">Upload Video File (Alternative to YouTube URL)</Label>
                    <Input
                      id="video_file"
                      type="file"
                      accept="video/*"
                      onChange={(e) => setVideoForm({...videoForm, video_file: e.target.files?.[0] || null})}
                    />
                    {videoForm.video_file && (
                      <p className="text-sm text-green-600 mt-1">File selected: {videoForm.video_file.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                    <Input
                      id="thumbnail_url"
                      value={videoForm.thumbnail_url}
                      onChange={(e) => setVideoForm({...videoForm, thumbnail_url: e.target.value})}
                      placeholder="https://example.com/thumbnail.jpg"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_featured"
                    checked={videoForm.is_featured}
                    onCheckedChange={(checked) => setVideoForm({...videoForm, is_featured: checked})}
                  />
                  <Label htmlFor="is_featured">Featured Video</Label>
                </div>

                <Button type="submit" className="w-full">
                  {editingVideo ? 'Update Video' : 'Create Video'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Artist</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {videos.map((video) => (
              <TableRow key={video.id}>
                <TableCell className="font-medium">{video.title}</TableCell>
                <TableCell>{getArtistName(video.artist_id)}</TableCell>
                <TableCell className="max-w-xs truncate">{video.description}</TableCell>
                <TableCell>{video.is_featured ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => editVideo(video)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteVideo(video.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};