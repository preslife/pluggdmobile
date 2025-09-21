import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Music, Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';

interface AudioFile {
  file: File;
  preview: string;
  uploaded: boolean;
  url?: string;
  bpm?: number;
  key?: string;
}

interface EnhancedSamplePackUploaderProps {
  onSuccess?: () => void;
}

export const EnhancedSamplePackUploader = ({ onSuccess }: EnhancedSamplePackUploaderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [genre, setGenre] = useState('');
  const [bpmRange, setBpmRange] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [coverArt, setCoverArt] = useState<File | null>(null);
  const [coverArtPreview, setCoverArtPreview] = useState<string>('');
  const [samples, setSamples] = useState<AudioFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'audio/*': ['.mp3', '.wav', '.flac', '.aiff', '.m4a']
    },
    multiple: true,
    onDrop: (acceptedFiles) => {
      const newSamples = acceptedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        uploaded: false
      }));
      setSamples(prev => [...prev, ...newSamples]);
    }
  });

  const { getRootProps: getCoverRootProps, getInputProps: getCoverInputProps } = useDropzone({
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp']
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles[0]) {
        setCoverArt(acceptedFiles[0]);
        setCoverArtPreview(URL.createObjectURL(acceptedFiles[0]));
      }
    }
  });

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const removeSample = (index: number) => {
    const sample = samples[index];
    if (sample.preview) {
      URL.revokeObjectURL(sample.preview);
    }
    setSamples(samples.filter((_, i) => i !== index));
  };

  const playPreview = (preview: string) => {
    if (currentlyPlaying === preview) {
      // Stop current
      if (audioElements[preview]) {
        audioElements[preview].pause();
        audioElements[preview].currentTime = 0;
      }
      setCurrentlyPlaying(null);
    } else {
      // Stop any currently playing
      if (currentlyPlaying && audioElements[currentlyPlaying]) {
        audioElements[currentlyPlaying].pause();
        audioElements[currentlyPlaying].currentTime = 0;
      }

      // Play new
      if (!audioElements[preview]) {
        const audio = new Audio(preview);
        audio.addEventListener('ended', () => setCurrentlyPlaying(null));
        setAudioElements(prev => ({ ...prev, [preview]: audio }));
        audio.play();
      } else {
        audioElements[preview].play();
      }
      setCurrentlyPlaying(preview);
    }
  };

  const uploadFiles = async () => {
    if (!user) throw new Error('User not authenticated');

    setUploadProgress(10);

    // Upload cover art
    let coverArtUrl = '';
    if (coverArt) {
      const coverFileName = `${user.id}/${Date.now()}_cover.${coverArt.name.split('.').pop()}`;
      const { data: coverData, error: coverError } = await supabase.storage
        .from('sample-pack-files')
        .upload(coverFileName, coverArt);

      if (coverError) throw coverError;

      const { data: coverUrlData } = supabase.storage
        .from('sample-pack-files')
        .getPublicUrl(coverData.path);

      coverArtUrl = coverUrlData.publicUrl;
    }

    setUploadProgress(30);

    // Upload samples and create ZIP
    const uploadedSamples = [];
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      const fileName = `${user.id}/${Date.now()}_${sample.file.name}`;
      
      const { data, error } = await supabase.storage
        .from('sample-pack-files')
        .upload(fileName, sample.file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('sample-pack-files')
        .getPublicUrl(data.path);

      uploadedSamples.push({
        name: sample.file.name,
        url: urlData.publicUrl
      });

      setUploadProgress(30 + (i + 1) / samples.length * 40);
    }

    // Create pack ZIP file name (this would be generated by a backend service)
    const packFileName = `${user.id}/${Date.now()}_${title.replace(/\s+/g, '_')}.zip`;

    setUploadProgress(80);

    return { coverArtUrl, packFileName, uploadedSamples };
  };

  const uploadSamplePack = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload sample packs",
        variant: "destructive"
      });
      return;
    }

    if (!title || !genre || samples.length === 0) {
      toast({
        title: "Missing required fields",
        description: "Please fill in title, genre, and add at least one sample",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const { coverArtUrl, packFileName } = await uploadFiles();

      // Convert price to pence for GBP
      const pricePence = Math.round(price * 100);

      const { error } = await supabase
        .from('sample_packs')
        .insert({
          user_id: user.id,
          title,
          description,
          price,
          price_pence: pricePence,
          genre,
          bpm_range: bpmRange,
          sample_count: samples.length,
          cover_art_url: coverArtUrl,
          download_url: packFileName,
          tags,
          is_active: false, // Needs approval
          approval_status: 'pending'
        });

      if (error) throw error;

      setUploadProgress(100);
      toast({ 
        title: 'Sample pack uploaded', 
        description: 'Your sample pack has been submitted for review' 
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setPrice(0);
      setGenre('');
      setBpmRange('');
      setTags([]);
      setCoverArt(null);
      setCoverArtPreview('');
      setSamples([]);
      
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Sample Pack</CardTitle>
        <CardDescription>
          Share your sample pack with the community and start earning
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Pack Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter sample pack title"
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price (£)</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              placeholder="0.00 for free"
              disabled={uploading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your sample pack..."
            disabled={uploading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="genre">Genre *</Label>
            <Select value={genre} onValueChange={setGenre} disabled={uploading}>
              <SelectTrigger>
                <SelectValue placeholder="Select genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trap">Trap</SelectItem>
                <SelectItem value="hip-hop">Hip Hop</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="techno">Techno</SelectItem>
                <SelectItem value="ambient">Ambient</SelectItem>
                <SelectItem value="experimental">Experimental</SelectItem>
                <SelectItem value="drill">Drill</SelectItem>
                <SelectItem value="afrobeats">Afrobeats</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bpm">BPM Range</Label>
            <Input
              id="bpm"
              value={bpmRange}
              onChange={(e) => setBpmRange(e.target.value)}
              placeholder="e.g., 140-150"
              disabled={uploading}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag..."
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
              disabled={uploading}
            />
            <Button type="button" onClick={addTag} disabled={uploading}>
              Add
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                {tag}
                <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
              </Badge>
            ))}
          </div>
        </div>

        {/* Cover Art Upload */}
        <div className="space-y-2">
          <Label>Cover Art</Label>
          <div
            {...getCoverRootProps()}
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:bg-muted/5 transition-colors"
          >
            <input {...getCoverInputProps()} />
            {coverArtPreview ? (
              <div className="space-y-2">
                <img src={coverArtPreview} alt="Cover preview" className="mx-auto max-h-32 rounded" />
                <p className="text-sm text-muted-foreground">Click to change cover art</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drop cover art here or click to browse
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sample Files Upload */}
        <div className="space-y-2">
          <Label>Sample Files *</Label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:bg-muted/5'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">
              {isDragActive 
                ? 'Drop the files here...'
                : 'Drop sample files here or click to browse'
              }
            </p>
            <p className="text-xs text-muted-foreground">
              Supports MP3, WAV, FLAC, AIFF, M4A
            </p>
          </div>

          {/* Sample Files List */}
          {samples.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {samples.map((sample, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                  <Music className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{sample.file.name}</span>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => playPreview(sample.preview)}
                    disabled={uploading}
                  >
                    {currentlyPlaying === sample.preview ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSample(index)}
                    disabled={uploading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <Label>Upload Progress</Label>
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {uploadProgress}% complete
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={uploading}>
            Save Draft
          </Button>
          <Button onClick={uploadSamplePack} disabled={uploading || samples.length === 0}>
            {uploading ? 'Uploading...' : 'Submit for Review'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};