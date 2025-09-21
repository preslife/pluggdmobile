import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Music, Plus, Save, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const genres = [
  "Hip Hop", "R&B", "Pop", "Rock", "Electronic", "Jazz", "Blues", "Country", 
  "Reggae", "Classical", "Alternative", "Indie", "Folk", "Metal"
];

const releaseTypes = [
  "Single", "EP", "Album", "Mixtape", "Compilation", "Live Album"
];

export const ReleaseCreator = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    description: "",
    genre: "",
    release_type: "Single",
    price: 0,
    pay_what_you_want: false,
    minimum_price: 0,
    release_date: new Date().toISOString().split('T')[0],
    cover_art_file: null as File | null,
    is_premium_content: false
  });

  const [coverArtPreview, setCoverArtPreview] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setFormData(prev => ({ ...prev, cover_art_file: file }));
    setCoverArtPreview(URL.createObjectURL(file));
  };

  const uploadCoverArt = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `covers/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('release-artwork')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('release-artwork')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to create a release");
      return;
    }

    if (!formData.title.trim() || !formData.artist.trim()) {
      toast.error("Please provide both title and artist name");
      return;
    }

    setIsCreating(true);
    try {
      let coverArtUrl = "";
      
      // Upload cover art if provided
      if (formData.cover_art_file) {
        coverArtUrl = await uploadCoverArt(formData.cover_art_file);
      }

      // Create release record
      const { data, error } = await supabase
        .from('releases')
        .insert({
          title: formData.title,
          artist: formData.artist,
          description: formData.description || null,
          genre: formData.genre || null,
          release_type: formData.release_type,
          price: formData.price,
          pay_what_you_want: formData.pay_what_you_want,
          minimum_price: formData.minimum_price,
          release_date: formData.release_date,
          cover_art_url: coverArtUrl || null,
          is_premium_content: formData.is_premium_content,
          approval_status: 'auto_approved',
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Release created successfully!");
      
      // Navigate to the new release
      navigate(`/release/${data.id}`);
    } catch (error) {
      console.error('Error creating release:', error);
      toast.error("Failed to create release");
    } finally {
      setIsCreating(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">Sign In Required</h3>
          <p className="text-muted-foreground">You must be logged in to create releases</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Create New Release
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Release Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter release title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="artist">Artist Name *</Label>
              <Input
                id="artist"
                value={formData.artist}
                onChange={(e) => setFormData(prev => ({ ...prev, artist: e.target.value }))}
                placeholder="Enter artist name"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Tell us about your release..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <Select value={formData.genre} onValueChange={(value) => setFormData(prev => ({ ...prev, genre: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  {genres.map(genre => (
                    <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="release-type">Release Type</Label>
              <Select value={formData.release_type} onValueChange={(value) => setFormData(prev => ({ ...prev, release_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {releaseTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="release-date">Release Date</Label>
              <Input
                id="release-date"
                type="date"
                value={formData.release_date}
                onChange={(e) => setFormData(prev => ({ ...prev, release_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Pricing & Options</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (£)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>

              {formData.pay_what_you_want && (
                <div className="space-y-2">
                  <Label htmlFor="minimum-price">Minimum Price (£)</Label>
                  <Input
                    id="minimum-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minimum_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, minimum_price: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.pay_what_you_want}
                  onChange={(e) => setFormData(prev => ({ ...prev, pay_what_you_want: e.target.checked }))}
                  className="rounded border-border"
                />
                <span className="text-sm">Pay What You Want</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_premium_content}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_premium_content: e.target.checked }))}
                  className="rounded border-border"
                />
                <span className="text-sm">Premium Content</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover-art">Cover Art</Label>
            <Input
              id="cover-art"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            {coverArtPreview && (
              <div className="mt-2">
                <img
                  src={coverArtPreview}
                  alt="Cover art preview"
                  className="w-32 h-32 object-cover rounded-lg border"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isCreating} className="flex-1">
              {isCreating ? (
                <>
                  <Save className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Release
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};