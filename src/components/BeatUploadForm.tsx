import { formatCurrency } from "@/lib/utils";
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { X, Upload, Crown, Music, AudioLines, FileText, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/FileUpload';
import { UpgradeModal } from '@/components/UpgradeModal';

type BeatFormData = {
  title: string;
  description: string;
  genre: string;
  bpm: number;
  key: string;
  tags: string;
};

type LicenseType = 'basic_lease' | 'premium_lease' | 'unlimited_lease' | 'exclusive_rights';

interface LicenseOption {
  type: LicenseType;
  title: string;
  price: number;
  enabled: boolean;
}

interface BeatUploadFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const genres = [
  'Hip Hop', 'Trap', 'R&B', 'Pop', 'Electronic', 'Rock', 'Jazz', 'Classical', 'Country', 'Reggae',
  'Dancehall', 'Afrobeats', 'Drill', 'UK Drill', 'Grime', 'Soca', 'Bashment', 'Amapiano'
];

const keys = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];

const moods = [
  'Dark', 'Aggressive', 'Chill', 'Happy', 'Sad', 'Energetic', 'Bouncy', 'Hard',
  'Soft', 'Melodic', 'Atmospheric', 'Uplifting', 'Mysterious', 'Romantic', 'Party',
  'Smooth', 'Emotional', 'Epic', 'Dreamy', 'Intense'
];

const instruments = [
  'Piano', 'Guitar', 'Bass', 'Drums', 'Synth', 'Strings', 'Brass', 'Vocal Chops',
  'Flute', 'Saxophone', 'Violin', 'Organ', 'Electric Guitar', '808s', 'Hi-Hats',
  'Kicks', 'Snares', 'Percussion', 'Pad', 'Lead', 'Arp', 'FX'
];

const BeatUploadForm = ({ onSuccess, onCancel }: BeatUploadFormProps) => {
  const { user } = useAuth();
  const { subscription, usage, incrementUsage } = useSubscription();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [artworkUrl, setArtworkUrl] = useState<string>('');
  const [artworkFileName, setArtworkFileName] = useState<string>('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Enhanced upload fields
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [stemsUrl, setStemsUrl] = useState<string>('');
  const [stemsFileName, setStemsFileName] = useState<string>('');
  const [taggedUrl, setTaggedUrl] = useState<string>('');
  const [taggedFileName, setTaggedFileName] = useState<string>('');
  
  // License management
  const [licenseOptions, setLicenseOptions] = useState<LicenseOption[]>([
    { type: 'basic_lease', title: 'Basic Lease', price: 25, enabled: true },
    { type: 'premium_lease', title: 'Premium Lease', price: 50, enabled: false },
    { type: 'unlimited_lease', title: 'Unlimited Lease', price: 100, enabled: false },
    { type: 'exclusive_rights', title: 'Exclusive Rights', price: 500, enabled: false }
  ]);
  const [stemsRequired, setStemsRequired] = useState(false);

  const form = useForm<BeatFormData>({
    defaultValues: {
      title: '',
      description: '',
      genre: '',
      bpm: 120,
      key: '',
      tags: ''
    }
  });

  // Calculate the main price from the lowest enabled license
  const calculateMainPrice = () => {
    const enabledLicenses = licenseOptions.filter(l => l.enabled);
    if (enabledLicenses.length === 0) return 0;
    
    // Return the lowest price among enabled licenses
    return Math.min(...enabledLicenses.map(l => l.price));
  };

  const mainPrice = calculateMainPrice();
  const getMainPriceLabel = () => {
    const enabledLicenses = licenseOptions.filter(l => l.enabled);
    if (enabledLicenses.length === 0) return 'No licenses selected';
    
    const sortedLicenses = enabledLicenses.sort((a, b) => a.price - b.price);
    return sortedLicenses[0].title;
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Mood and instrument management
  const toggleMood = (mood: string) => {
    setSelectedMoods(prev => 
      prev.includes(mood) 
        ? prev.filter(m => m !== mood)
        : [...prev, mood]
    );
  };

  const toggleInstrument = (instrument: string) => {
    setSelectedInstruments(prev => 
      prev.includes(instrument) 
        ? prev.filter(i => i !== instrument)
        : [...prev, instrument]
    );
  };

  // License management functions
  const updateLicenseOption = (type: LicenseType, updates: Partial<LicenseOption>) => {
    setLicenseOptions(prev => prev.map(option => 
      option.type === type ? { ...option, ...updates } : option
    ));
  };

  const toggleLicense = (type: LicenseType) => {
    updateLicenseOption(type, { enabled: !licenseOptions.find(l => l.type === type)?.enabled });
  };

  const updateLicensePrice = (type: LicenseType, price: number) => {
    updateLicenseOption(type, { price });
  };

  // Check beat upload limits
  const getTierLimits = () => {
    switch (subscription?.tier) {
      case 'free':
        return { monthly: 10 };
      case 'creator':
        return { monthly: 15 };
      case 'pro':
        return { monthly: -1 }; // unlimited
      default:
        return { monthly: 2 };
    }
  };

  const limits = getTierLimits();
  const canUpload = limits.monthly === -1 || (usage?.beats_uploaded_month || 0) < limits.monthly;

  const handleUploadCheck = () => {
    if (!canUpload) {
      setShowUpgradeModal(true);
      return;
    }
    // Continue with normal upload flow
  };

  const onSubmit = async (data: BeatFormData) => {
    if (!user) return;

    if (!canUpload) {
      setShowUpgradeModal(true);
      return;
    }

    if (!audioUrl) {
      toast({
        title: "Audio file required",
        description: "Please upload an audio file for your beat.",
        variant: "destructive"
      });
      return;
    }

    // Validate stems requirement
    const enabledLicenses = licenseOptions.filter(l => l.enabled);
    const requiresStems = enabledLicenses.some(l => ['exclusive_rights'].includes(l.type));
    
      if (requiresStems && !stemsUrl) {
        toast({
          title: "Stems required",
          description: "Exclusive rights license requires stems to be uploaded.",
          variant: "destructive"
        });
        return;
      }

    setUploading(true);
    try {
      // Insert beat first
      const { data: beatData, error: beatError } = await supabase
        .from('beats')
        .insert([{
          user_id: user.id,
          title: data.title,
          description: data.description,
          genre: data.genre,
          bpm: data.bpm,
          key: data.key,
          price: mainPrice,
          tags: tags,
          moods: selectedMoods,
          instruments: selectedInstruments,
          audio_url: audioUrl,
          image_url: artworkUrl || null,
          stems_url: stemsUrl || null,
          tagged_url: taggedUrl || null,
          stems_required: stemsRequired,
          is_published: false
        }])
        .select()
        .maybeSingle();

      if (beatError) throw beatError;
      if (!beatData) throw new Error('Beat insert failed');

      // Insert licensing options
      const licensingData = enabledLicenses.map(license => ({
        beat_id: beatData.id,
        license_type: license.type,
        price: license.price,
        is_available: true
      }));

      if (licensingData.length > 0) {
        const { error: licensingError } = await supabase
          .from('licensing_options')
          .insert(licensingData);

        if (licensingError) throw licensingError;
      }

      

      // Increment usage count
      await incrementUsage('beats_uploaded_month');

      toast({
        title: "Success!",
        description: "Beat uploaded successfully."
      });

      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload beat.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload New Beat
          </CardTitle>
          <CardDescription>
            Add your beat to the marketplace. You can publish it later.
          </CardDescription>
          
          {/* Usage Warning */}
          {!canUpload && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <Crown className="h-4 w-4 text-destructive" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Upload limit reached</p>
                <p className="text-muted-foreground">
                  You've uploaded {usage?.beats_uploaded_month || 0}/{limits.monthly} beats this month. 
                  Upgrade to upload more.
                </p>
              </div>
            </div>
          )}
          
          {/* Usage Info */}
          {canUpload && limits.monthly !== -1 && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 border rounded-lg">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <p>
                  {usage?.beats_uploaded_month || 0}/{limits.monthly} beats uploaded this month
                  {subscription?.tier === 'free' && ' • Upgrade for more uploads'}
                </p>
              </div>
            </div>
          )}
        </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                rules={{ required: 'Title is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter beat title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="genre"
                rules={{ required: 'Genre is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Genre</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select genre" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {genres.map(genre => (
                          <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your beat..." 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="bpm"
                rules={{ 
                  required: 'BPM is required',
                  min: { value: 60, message: 'BPM must be at least 60' },
                  max: { value: 200, message: 'BPM must be less than 200' }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BPM</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="120"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="key"
                rules={{ required: 'Key is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select key" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {keys.map(key => (
                          <SelectItem key={key} value={key}>{key}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="p-4 bg-muted/50 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <FormLabel className="text-sm font-medium">Starting Price</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Based on your selected licenses
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{formatCurrency(mainPrice)}</div>
                    <div className="text-xs text-muted-foreground">
                      {getMainPriceLabel()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Audio File Upload */}
            <div className="space-y-3">
              <FormLabel>Audio File</FormLabel>
              <FileUpload
                onUpload={(url, fileName) => {
                  setAudioUrl(url);
                  setAudioFileName(fileName);
                }}
                accept="audio/*"
                bucketName="audio-files"
                maxSizeMB={100}
              />
              {audioUrl && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">✓ {audioFileName}</p>
                  <div className="p-3 bg-muted/50 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      Audio preview: {form.watch('title') || 'Untitled Beat'}
                    </p>
                    <audio 
                      controls 
                      src={audioUrl}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Artwork Upload */}
            <div className="space-y-3">
              <FormLabel>Beat Artwork (Optional)</FormLabel>
              <FileUpload
                onUpload={(url, fileName) => {
                  setArtworkUrl(url);
                  setArtworkFileName(fileName);
                }}
                accept="image/*"
                bucketName="beat-artwork"
                maxSizeMB={10}
              />
              {artworkUrl && (
                <div className="flex items-center gap-2">
                  <img src={artworkUrl} alt="Beat artwork" className="w-16 h-16 rounded object-cover" />
                  <p className="text-sm text-muted-foreground">✓ {artworkFileName}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <FormLabel>Tags</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tags..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} variant="outline">
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Moods Selection */}
            <div className="space-y-3">
              <FormLabel className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                Moods
              </FormLabel>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {moods.map((mood) => (
                  <div key={mood} className="flex items-center space-x-2">
                    <Checkbox
                      id={`mood-${mood}`}
                      checked={selectedMoods.includes(mood)}
                      onCheckedChange={() => toggleMood(mood)}
                    />
                    <label
                      htmlFor={`mood-${mood}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {mood}
                    </label>
                  </div>
                ))}
              </div>
              {selectedMoods.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedMoods.map((mood) => (
                    <Badge key={mood} variant="outline" className="flex items-center gap-1">
                      {mood}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => toggleMood(mood)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Instruments Selection */}
            <div className="space-y-3">
              <FormLabel className="flex items-center gap-2">
                <AudioLines className="h-4 w-4" />
                Instruments
              </FormLabel>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {instruments.map((instrument) => (
                  <div key={instrument} className="flex items-center space-x-2">
                    <Checkbox
                      id={`instrument-${instrument}`}
                      checked={selectedInstruments.includes(instrument)}
                      onCheckedChange={() => toggleInstrument(instrument)}
                    />
                    <label
                      htmlFor={`instrument-${instrument}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {instrument}
                    </label>
                  </div>
                ))}
              </div>
              {selectedInstruments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedInstruments.map((instrument) => (
                    <Badge key={instrument} variant="outline" className="flex items-center gap-1">
                      {instrument}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => toggleInstrument(instrument)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* License Options */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <FormLabel className="text-lg font-semibold">Licensing Options</FormLabel>
              </div>
              <p className="text-sm text-muted-foreground">
                Select which license types you want to offer for this beat. Premium licenses typically require stems.
              </p>
              
              <div className="grid gap-4">
                {licenseOptions.map((license) => (
                  <div key={license.type} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`license-${license.type}`}
                          checked={license.enabled}
                          onCheckedChange={() => toggleLicense(license.type)}
                        />
                        <div>
                          <label
                            htmlFor={`license-${license.type}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {license.title}
                          </label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {license.type === 'basic_lease' && 'Standard licensing for non-commercial use'}
                            {license.type === 'premium_lease' && 'Enhanced licensing with stems included'}
                            {license.type === 'unlimited_lease' && 'Unlimited usage rights with stems'}
                            {license.type === 'exclusive_rights' && 'Exclusive ownership and all rights'}
                          </p>
                        </div>
                      </div>
                      {license.enabled && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">$</span>
                          <Input
                            type="number"
                            value={license.price}
                            onChange={(e) => updateLicensePrice(license.type, parseFloat(e.target.value) || 0)}
                            className="w-20"
                            min="1"
                            step="1"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* License Summary */}
              {licenseOptions.some(l => l.enabled) && (
                <div className="p-4 bg-muted/50 border rounded-lg">
                  <h4 className="font-medium mb-2">License Summary</h4>
                  <div className="space-y-2">
                    {licenseOptions
                      .filter(l => l.enabled)
                      .map(license => (
                        <div key={license.type} className="flex justify-between text-sm">
                          <span>{license.title}</span>
                          <span className="font-medium">{formatCurrency(license.price)}</span>
                        </div>
                      ))
                    }
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex justify-between font-medium">
                      <span>Total Potential:</span>
                      <span>{formatCurrency(licenseOptions.filter(l => l.enabled).reduce((sum, l) => sum + l.price, 0))}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Stems Upload */}
            <div className="space-y-3">
              <FormLabel className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Stems
                {licenseOptions.some(l => l.enabled && ['exclusive_rights'].includes(l.type)) && 
                  <Badge variant="secondary" className="ml-2">Required</Badge>
                }
              </FormLabel>
              <p className="text-sm text-muted-foreground">
                {licenseOptions.some(l => l.enabled && ['exclusive_rights'].includes(l.type))
                  ? 'Stems are required for exclusive rights license.'
                  : 'Upload a ZIP file containing individual track stems (optional for most licenses, required for exclusive rights).'
                }
              </p>
              <FileUpload
                onUpload={(url, fileName) => {
                  setStemsUrl(url);
                  setStemsFileName(fileName);
                }}
                accept="audio/*,.zip,.rar"
                bucketName="audio-files"
                maxSizeMB={200}
                allowMultiple={true}
              />
              {stemsUrl && (
                <p className="text-sm text-muted-foreground">✓ {stemsFileName}</p>
              )}
            </div>

            {/* Tagged Version Upload (Optional) */}
            <div className="space-y-3">
              <FormLabel>Tagged/Watermarked Version (Optional)</FormLabel>
              <p className="text-sm text-muted-foreground">
                Upload a tagged version with your producer tag for previews
              </p>
              <FileUpload
                onUpload={(url, fileName) => {
                  setTaggedUrl(url);
                  setTaggedFileName(fileName);
                }}
                accept="audio/*"
                bucketName="audio-files"
                maxSizeMB={100}
              />
              {taggedUrl && (
                <p className="text-sm text-muted-foreground">✓ {taggedFileName}</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                disabled={uploading || !canUpload} 
                className="flex-1"
              >
                {uploading ? 'Uploading...' : !canUpload ? 'Upgrade Required' : 'Upload Beat'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>

    <UpgradeModal 
      isOpen={showUpgradeModal}
      onClose={() => setShowUpgradeModal(false)}
      feature="beat uploads"
      currentTier={subscription?.tier || 'free'}
    />
    </>
  );
};

export default BeatUploadForm;