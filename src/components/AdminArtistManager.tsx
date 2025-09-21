import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Artist {
  id: string;
  name: string;
  bio: string;
  image_url: string;
  website_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  spotify_url?: string;
  apple_music_url?: string;
  youtube_url?: string;
  soundcloud_url?: string;
  is_featured: boolean;
  created_at: string;
}

export const AdminArtistManager = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const { toast } = useToast();

  const [artistForm, setArtistForm] = useState({
    name: '',
    bio: '',
    image_url: '',
    website_url: '',
    instagram_url: '',
    twitter_url: '',
    spotify_url: '',
    apple_music_url: '',
    youtube_url: '',
    soundcloud_url: '',
    is_featured: false
  });

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArtists(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch artists",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingArtist) {
        const { error } = await supabase
          .from('artists')
          .update(artistForm)
          .eq('id', editingArtist.id);
        if (error) throw error;
        toast({ title: "Success", description: "Artist updated successfully" });
      } else {
        const { error } = await supabase
          .from('artists')
          .insert([artistForm]);
        if (error) throw error;
        toast({ title: "Success", description: "Artist created successfully" });
      }

      resetForm();
      setDialogOpen(false);
      fetchArtists();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save artist",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `artists/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('artist-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('artist-images')
        .getPublicUrl(filePath);

      setArtistForm(prev => ({ ...prev, image_url: publicUrl }));
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setArtistForm({
      name: '',
      bio: '',
      image_url: '',
      website_url: '',
      instagram_url: '',
      twitter_url: '',
      spotify_url: '',
      apple_music_url: '',
      youtube_url: '',
      soundcloud_url: '',
      is_featured: false
    });
    setEditingArtist(null);
  };

  const editArtist = (artist: Artist) => {
    setEditingArtist(artist);
    setArtistForm({
      name: artist.name,
      bio: artist.bio || '',
      image_url: artist.image_url || '',
      website_url: artist.website_url || '',
      instagram_url: artist.instagram_url || '',
      twitter_url: artist.twitter_url || '',
      spotify_url: artist.spotify_url || '',
      apple_music_url: artist.apple_music_url || '',
      youtube_url: artist.youtube_url || '',
      soundcloud_url: artist.soundcloud_url || '',
      is_featured: artist.is_featured
    });
    setDialogOpen(true);
  };

  const deleteArtist = async (id: string) => {
    try {
      const { error } = await supabase
        .from('artists')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Artist deleted successfully" });
      fetchArtists();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete artist",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading artists...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Manage Artists
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Artist
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingArtist ? 'Edit Artist' : 'Add New Artist'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Artist Name</Label>
                    <Input
                      id="name"
                      value={artistForm.name}
                      onChange={(e) => setArtistForm({...artistForm, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="image_upload">Artist Image</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          id="image_upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('image_upload')?.click()}
                          disabled={uploading}
                          className="flex-1"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploading ? 'Uploading...' : 'Upload Image'}
                        </Button>
                        {artistForm.image_url && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setArtistForm({...artistForm, image_url: ''})}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {artistForm.image_url && (
                        <div className="mt-2">
                          <img 
                            src={artistForm.image_url} 
                            alt="Artist preview" 
                            className="w-20 h-20 object-cover rounded-lg border"
                          />
                        </div>
                      )}
                      <Input
                        placeholder="Or paste image URL"
                        value={artistForm.image_url}
                        onChange={(e) => setArtistForm({...artistForm, image_url: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={artistForm.bio}
                    onChange={(e) => setArtistForm({...artistForm, bio: e.target.value})}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input
                    id="website_url"
                    value={artistForm.website_url}
                    onChange={(e) => setArtistForm({...artistForm, website_url: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="spotify_url">Spotify URL</Label>
                    <Input
                      id="spotify_url"
                      value={artistForm.spotify_url}
                      onChange={(e) => setArtistForm({...artistForm, spotify_url: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="apple_music_url">Apple Music URL</Label>
                    <Input
                      id="apple_music_url"
                      value={artistForm.apple_music_url}
                      onChange={(e) => setArtistForm({...artistForm, apple_music_url: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="youtube_url">YouTube URL</Label>
                    <Input
                      id="youtube_url"
                      value={artistForm.youtube_url}
                      onChange={(e) => setArtistForm({...artistForm, youtube_url: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="soundcloud_url">SoundCloud URL</Label>
                    <Input
                      id="soundcloud_url"
                      value={artistForm.soundcloud_url}
                      onChange={(e) => setArtistForm({...artistForm, soundcloud_url: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="instagram_url">Instagram URL</Label>
                    <Input
                      id="instagram_url"
                      value={artistForm.instagram_url}
                      onChange={(e) => setArtistForm({...artistForm, instagram_url: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitter_url">Twitter URL</Label>
                    <Input
                      id="twitter_url"
                      value={artistForm.twitter_url}
                      onChange={(e) => setArtistForm({...artistForm, twitter_url: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_featured"
                    checked={artistForm.is_featured}
                    onCheckedChange={(checked) => setArtistForm({...artistForm, is_featured: checked})}
                  />
                  <Label htmlFor="is_featured">Featured Artist</Label>
                </div>

                <Button type="submit" className="w-full">
                  {editingArtist ? 'Update Artist' : 'Create Artist'}
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
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Bio</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {artists.map((artist) => (
              <TableRow key={artist.id}>
                <TableCell>
                  {artist.image_url ? (
                    <img 
                      src={artist.image_url} 
                      alt={artist.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">
                        {artist.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{artist.name.charAt(0).toUpperCase() + artist.name.slice(1).toLowerCase()}</TableCell>
                <TableCell className="max-w-xs truncate">{artist.bio}</TableCell>
                <TableCell>{artist.is_featured ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => editArtist(artist)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteArtist(artist.id)}>
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