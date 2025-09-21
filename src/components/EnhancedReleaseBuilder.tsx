import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CalendarIcon, Upload, Check, X, Music, Image, FileAudio, Users, Award } from 'lucide-react';
import { format } from 'date-fns';
import { GenreSelector } from './GenreSelector';
import { PublishAsSelector, usePublishAs } from './PublishAsSelector';

interface ReleaseTrack {
  id: string;
  title: string;
  duration?: string;
  file?: File;
  url?: string;
  uploaded?: boolean;
  track_number?: number;
}

interface Collaborator {
  id?: string;
  name: string;
  email?: string;
  role: 'featured_artist' | 'vocalist' | 'producer' | 'songwriter' | 'composer' | 'label' | 'manager' | 'other';
  role_description?: string;
  is_external: boolean;
  user_id?: string;
}

interface Split {
  id?: string;
  collaborator_id: string;
  split_type: 'master_recording' | 'publishing' | 'performance' | 'mechanical';
  percentage: number;
  description?: string;
}

export const EnhancedReleaseBuilder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { publishAs, setPublishAs, getOwnerData } = usePublishAs();
  
  // Basic release info
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [primaryGenre, setPrimaryGenre] = useState('');
  const [subGenre, setSubGenre] = useState('');
  const [releaseType, setReleaseType] = useState('Single');
  const [price, setPrice] = useState(0);
  const [upcCode, setUpcCode] = useState('');
  const [isrc, setIsrc] = useState('');
  const [payWhatYouWant, setPayWhatYouWant] = useState(false);
  const [minimumPrice, setMinimumPrice] = useState(0);
  
  // Release scheduling
  const [releaseDate, setReleaseDate] = useState<Date>();
  const [digitalReleaseDate, setDigitalReleaseDate] = useState<Date>();
  
  // Files
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [tracks, setTracks] = useState<ReleaseTrack[]>([
    { id: crypto.randomUUID(), title: '' }
  ]);
  
  // Distribution settings
  const [distributeToSpotify, setDistributeToSpotify] = useState(true);
  const [distributeToApple, setDistributeToApple] = useState(true);
  const [distributeToYoutube, setDistributeToYoutube] = useState(true);
  
  // Upload progress
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [releaseId, setReleaseId] = useState<string | null>(null);
  
  // Credits
  const [label, setLabel] = useState('');
  const [producers, setProducers] = useState<string[]>(['']);
  const [executiveProducer, setExecutiveProducer] = useState('');
  const [songwriters, setSongwriters] = useState<string[]>(['']);
  const [composers, setComposers] = useState<string[]>(['']);
  const [mixingEngineer, setMixingEngineer] = useState('');
  const [masteringEngineer, setMasteringEngineer] = useState('');
  const [recordingEngineer, setRecordingEngineer] = useState('');
  const [language, setLanguage] = useState('English');

  // Collaborators and splits
  const [featuredArtists, setFeaturedArtists] = useState<string[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [splits, setSplits] = useState<Split[]>([]);
  const [owns100Percent, setOwns100Percent] = useState(false);
  const [distributionRightsConfirmed, setDistributionRightsConfirmed] = useState(false);
  
  // Edit mode detection
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = Boolean(editId);
  const [loading, setLoading] = useState(isEditMode);

  // Multi-stage form state
  const [currentStage, setCurrentStage] = useState(1);
  const [showAdditionalCredits, setShowAdditionalCredits] = useState(false);

  const stages = [
    { id: 1, title: 'Basic Information', description: 'Release title, artist, and genre' },
    { id: 2, title: 'Artwork & Audio', description: 'Upload your cover art and tracks' },
    { id: 3, title: 'Credits & Details', description: 'Credits, language, and additional details' },
    { id: 4, title: 'Pricing & Distribution', description: 'Set pricing, codes, and distribution settings' }
  ];

  // Load existing release data when in edit mode
  useEffect(() => {
    if (isEditMode && editId && user) {
      loadReleaseForEditing(editId);
    }
  }, [isEditMode, editId, user]);

  const loadReleaseForEditing = async (id: string) => {
    try {
      setLoading(true);
      
      // Load from releases table (now handles all statuses)
      const { data: release, error } = await supabase
        .from('releases')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      
      if (release) {
        // Populate form with existing data
        setTitle(release.title || '');
        setArtist(release.artist || '');
        setDescription(release.description || '');
        setGenre(release.genre || '');
        setPrimaryGenre(release.primary_genre || release.genre || '');
        setSubGenre(release.sub_genre || '');
        setReleaseType(release.release_type || 'Single');
        setPrice(release.price || 0);
        setUpcCode(release.upc_code || '');
        setIsrc(release.isrc_code || '');
        setPayWhatYouWant(release.pay_what_you_want || false);
        setMinimumPrice(release.minimum_price || 0);
        setCoverUrl(release.cover_art_url || '');
        setReleaseId(release.id);

        // Load credits - use array fields
        setLabel(release.label || '');
        setProducers(release.producers && release.producers.length > 0 ? release.producers : ['']);
        setExecutiveProducer(release.executive_producer || '');
        setSongwriters(release.songwriters && release.songwriters.length > 0 ? release.songwriters : ['']);
        setComposers(release.composers && release.composers.length > 0 ? release.composers : ['']);
        setMixingEngineer(release.mixing_engineer || '');
        setMasteringEngineer(release.mastering_engineer || '');
        setRecordingEngineer(release.recording_engineer || '');
        setLanguage(release.language || 'English');
        
        // Set release dates
        if (release.release_date) {
          setReleaseDate(new Date(release.release_date));
        }
        if (release.digital_release_date) {
          setDigitalReleaseDate(new Date(release.digital_release_date));
        }
        
        // Set distribution settings
        const distSettings = release.distribution_settings || {};
        setDistributeToSpotify(distSettings.spotify !== false);
        setDistributeToApple(distSettings.apple_music !== false);
        setDistributeToYoutube(distSettings.youtube_music !== false);
        
        // Load existing tracks
        const { data: existingTracks } = await supabase
          .from('tracks')
          .select('*')
          .eq('release_id', release.id)
          .order('track_number');
        
        if (existingTracks && existingTracks.length > 0) {
          const loadedTracks = existingTracks.map(track => ({
            id: track.id,
            title: track.title,
            url: track.audio_url,
            duration: track.duration?.toString() || '',
            track_number: track.track_number,
            uploaded: true, // Mark as uploaded since it exists in database
            file: undefined // No file object needed for existing tracks
          }));
          setTracks(loadedTracks);
        }

        // Load featured artists, ownership flags, and collaborators
        setFeaturedArtists(release.featured_artists || []);
        setOwns100Percent(release.owns_100_percent || false);
        setDistributionRightsConfirmed(release.distribution_rights_confirmed || false);

        // Load collaborators and splits
        const { data: existingCollaborators } = await supabase
          .from('collaborators')
          .select(`
            id, name, email, role, role_description, is_external, user_id,
            splits!inner(id, split_type, percentage, description)
          `)
          .eq('release_id', release.id);

        if (existingCollaborators && existingCollaborators.length > 0) {
          const loadedCollaborators: Collaborator[] = existingCollaborators.map(collab => ({
            id: collab.id,
            name: collab.name,
            email: collab.email || undefined,
            role: collab.role as any,
            role_description: collab.role_description || undefined,
            is_external: collab.is_external,
            user_id: collab.user_id || undefined
          }));
          setCollaborators(loadedCollaborators);

          // Load splits
          const loadedSplits: Split[] = [];
          existingCollaborators.forEach(collab => {
            if (collab.splits) {
              (Array.isArray(collab.splits) ? collab.splits : [collab.splits]).forEach((split: any) => {
                loadedSplits.push({
                  id: split.id,
                  collaborator_id: collab.id,
                  split_type: split.split_type,
                  percentage: split.percentage,
                  description: split.description || undefined
                });
              });
            }
          });
          setSplits(loadedSplits);
        }
        
        toast({
          title: 'Release loaded',
          description: `Editing "${release.title}" with ${existingTracks?.length || 0} tracks and ${existingCollaborators?.length || 0} collaborators`
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error loading release',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addTrack = () => {
    setTracks(prev => [...prev, { id: crypto.randomUUID(), title: '' }]);
  };

  const removeTrack = (id: string) => {
    setTracks(prev => prev.filter(t => t.id !== id));
  };

  const updateTrack = (id: string, updates: Partial<ReleaseTrack>) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  // Credit management functions
  const addProducer = () => {
    setProducers(prev => [...prev, '']);
  };

  const removeProducer = (index: number) => {
    setProducers(prev => prev.filter((_, i) => i !== index));
  };

  const updateProducer = (index: number, value: string) => {
    setProducers(prev => prev.map((producer, i) => i === index ? value : producer));
  };

  const addSongwriter = () => {
    setSongwriters(prev => [...prev, '']);
  };

  const removeSongwriter = (index: number) => {
    setSongwriters(prev => prev.filter((_, i) => i !== index));
  };

  const updateSongwriter = (index: number, value: string) => {
    setSongwriters(prev => prev.map((songwriter, i) => i === index ? value : songwriter));
  };

  const addComposer = () => {
    setComposers(prev => [...prev, '']);
  };

  const removeComposer = (index: number) => {
    setComposers(prev => prev.filter((_, i) => i !== index));
  };

  const updateComposer = (index: number, value: string) => {
    setComposers(prev => prev.map((composer, i) => i === index ? value : composer));
  };

  // Stage navigation functions
  const nextStage = () => {
    if (currentStage < stages.length) {
      setCurrentStage(currentStage + 1);
    }
  };

  const prevStage = () => {
    if (currentStage > 1) {
      setCurrentStage(currentStage - 1);
    }
  };

  const goToStage = (stageId: number) => {
    setCurrentStage(stageId);
  };

  // Stage validation
  const validateCurrentStage = () => {
    switch (currentStage) {
      case 1: // Basic Information
        return title.trim() && artist.trim() && primaryGenre;
      case 2: // Artwork & Audio
        return coverUrl && tracks.some(t => t.url || t.uploaded);
      case 3: // Credits & Details
        return true; // Credits are optional
      case 4: // Pricing & Distribution
        return true; // All fields are optional or have defaults
      default:
        return false;
    }
  };

  // Collaborator management functions
  const addFeaturedArtist = () => {
    setFeaturedArtists(prev => [...prev, '']);
  };

  const updateFeaturedArtist = (index: number, name: string) => {
    setFeaturedArtists(prev => prev.map((artist, i) => i === index ? name : artist));
  };

  const removeFeaturedArtist = (index: number) => {
    setFeaturedArtists(prev => prev.filter((_, i) => i !== index));
  };

  const addCollaborator = () => {
    const newCollaborator: Collaborator = {
      id: crypto.randomUUID(),
      name: '',
      role: 'featured_artist',
      is_external: true
    };
    setCollaborators(prev => [...prev, newCollaborator]);
  };

  const updateCollaborator = (id: string, updates: Partial<Collaborator>) => {
    setCollaborators(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeCollaborator = (id: string) => {
    setCollaborators(prev => prev.filter(c => c.id !== id));
    // Also remove associated splits
    setSplits(prev => prev.filter(s => s.collaborator_id !== id));
  };

  const addSplit = (collaboratorId: string) => {
    const newSplit: Split = {
      id: crypto.randomUUID(),
      collaborator_id: collaboratorId,
      split_type: 'master_recording',
      percentage: 0
    };
    setSplits(prev => [...prev, newSplit]);
  };

  const updateSplit = (id: string, updates: Partial<Split>) => {
    setSplits(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSplit = (id: string) => {
    setSplits(prev => prev.filter(s => s.id !== id));
  };

  // Auto-populate collaborators from featured artists
  const autoPopulateFromFeaturedArtists = () => {
    const newCollaborators: Collaborator[] = [];
    
    featuredArtists.filter(name => name.trim()).forEach(artistName => {
      // Check if this artist is already a collaborator
      const existingCollaborator = collaborators.find(c => 
        c.name.toLowerCase() === artistName.trim().toLowerCase() && 
        c.role === 'featured_artist'
      );
      
      if (!existingCollaborator) {
        newCollaborators.push({
          id: crypto.randomUUID(),
          name: artistName.trim(),
          role: 'featured_artist',
          is_external: true
        });
      }
    });
    
    if (newCollaborators.length > 0) {
      setCollaborators(prev => [...prev, ...newCollaborators]);
      toast({
        title: 'Collaborators added',
        description: `Added ${newCollaborators.length} featured artist(s) as collaborators`
      });
    }
  };

  // Auto-populate featured artists when featured artists change
  useEffect(() => {
    if (featuredArtists.length > 0) {
      // Suggest auto-population if there are featured artists but no collaborators
      const featuredArtistCollaborators = collaborators.filter(c => c.role === 'featured_artist');
      const missingArtists = featuredArtists.filter(artist => 
        artist.trim() && !featuredArtistCollaborators.some(c => 
          c.name.toLowerCase() === artist.trim().toLowerCase()
        )
      );
      
      if (missingArtists.length > 0 && collaborators.length === 0) {
        // Auto-populate when no collaborators exist
        autoPopulateFromFeaturedArtists();
      }
    }
  }, [featuredArtists]);

  const uploadFile = async (file: File, bucket: string, path?: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    
    const filePath = path || `${user.id}/${Date.now()}-${file.name}`;
    // Use signed upload for files > 50MB to bypass default gateway limits
    const FIFTY_MB = 50 * 1024 * 1024;
    if (file.size > FIFTY_MB) {
      // Try signed upload URL path first
      const { data: signed, error: signedErr } = await supabase.storage
        .from(bucket)
        .createSignedUploadUrl(filePath);
      if (signedErr || !signed?.token) {
        // Fallback to normal upload if signed upload not permitted
        const { error: fallbackErr } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (fallbackErr) throw fallbackErr;
      } else {
        const { error: upErr } = await supabase.storage
          .from(bucket)
          .uploadToSignedUrl(filePath, signed.token, file, { contentType: file.type });
        if (upErr) throw upErr;
      }
    } else {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const uploadCover = async () => {
    if (!coverFile) return;
    try {
      const url = await uploadFile(coverFile, 'release-artwork');
      setCoverUrl(url);
      toast({ title: 'Cover uploaded successfully' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    }
  };

  const uploadTracks = async () => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const totalTracks = tracks.filter(t => t.file).length;
      let uploadedCount = 0;
      
      for (const track of tracks) {
        if (track.file && (!track.uploaded || !track.url)) {
          const url = await uploadFile(track.file, 'release-audio');
          updateTrack(track.id, { url, uploaded: true });
          uploadedCount++;
          setUploadProgress((uploadedCount / totalTracks) * 100);
        }
      }
      
      toast({ title: 'All tracks uploaded successfully' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const validateRelease = (): string[] => {
    const errors: string[] = [];
    
    if (!title.trim()) errors.push('Title is required');
    if (!artist.trim()) errors.push('Artist name is required');
    if (!primaryGenre && !genre) errors.push('Primary genre is required');
    if (!coverUrl) errors.push('Cover artwork is required');
    if (tracks.filter(t => t.title.trim()).length === 0) errors.push('At least one track is required');
    if (releaseType === 'Album' && tracks.length < 7) errors.push('Albums require at least 7 tracks');
    if (releaseType === 'EP' && (tracks.length < 3 || tracks.length > 6)) errors.push('EPs require 3-6 tracks');
    
    return errors;
  };

  const saveDraft = async () => {
    if (!user) {
      toast({ title: 'Authentication required', variant: 'destructive' });
      return;
    }

    if (!title.trim()) {
      toast({ 
        title: 'Title required', 
        description: 'Please enter a title to save as draft', 
        variant: 'destructive' 
      });
      return;
    }

    setSubmitting(true);
    
    try {
      console.log('Attempting to save draft with data:', {
        title,
        artist,
        status: 'draft',
        user_id: user.id
      });
      
      if (releaseId) {
        // Update existing draft in unified releases table
        const ownerData = getOwnerData();
        const { error } = await supabase
          .from('releases')
          .update({
            title,
            artist,
            description,
            genre: primaryGenre || genre,
            primary_genre: primaryGenre,
            sub_genre: subGenre,
            release_type: releaseType,
            cover_art_url: coverUrl,
            price,
            pay_what_you_want: payWhatYouWant,
            minimum_price: payWhatYouWant ? minimumPrice : null,
            upc_code: upcCode || null,
            release_date: releaseDate ? releaseDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            digital_release_date: digitalReleaseDate?.toISOString(),
            distribution_settings: {
              spotify: distributeToSpotify,
              apple_music: distributeToApple,
              youtube_music: distributeToYoutube
            },
            // Ownership data
            owner_type: ownerData.owner_type,
            owner_id: ownerData.owner_id,
            // Credits - with fallback for missing columns
            label: label.trim() || null,
            ...(producers.filter(p => p.trim()).length > 0 && { producers: producers.filter(p => p.trim()) }),
            executive_producer: executiveProducer.trim() || null,
            ...(songwriters.filter(s => s.trim()).length > 0 && { songwriters: songwriters.filter(s => s.trim()) }),
            ...(composers.filter(c => c.trim()).length > 0 && { composers: composers.filter(c => c.trim()) }),
            mixing_engineer: mixingEngineer.trim() || null,
            mastering_engineer: masteringEngineer.trim() || null,
            recording_engineer: recordingEngineer.trim() || null,
            language: language,
            status: 'draft',
            approved: false
          })
          .eq('id', releaseId);

        if (error) throw error;
        // Notify creator of successful draft save
        try {
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: 'Draft saved',
            message: `Your release "${title}" has been saved as a draft.`,
            type: 'success',
            related_id: releaseId,
            related_type: 'release'
          });
        } catch {}
      } else {
        // Create new draft in unified releases table
        const ownerData = getOwnerData();
        const { data: release, error } = await supabase
          .from('releases')
          .insert({
            title,
            artist,
            description,
            genre: primaryGenre || genre,
            primary_genre: primaryGenre,
            sub_genre: subGenre,
            release_type: releaseType,
            cover_art_url: coverUrl,
            price,
            pay_what_you_want: payWhatYouWant,
            minimum_price: payWhatYouWant ? minimumPrice : null,
            upc_code: upcCode || null,
            release_date: releaseDate ? releaseDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            digital_release_date: digitalReleaseDate?.toISOString(),
            distribution_settings: {
              spotify: distributeToSpotify,
              apple_music: distributeToApple,
              youtube_music: distributeToYoutube
            },
            // Ownership data
            owner_type: ownerData.owner_type,
            owner_id: ownerData.owner_id,
            // Credits - with fallback for missing columns
            label: label.trim() || null,
            ...(producers.filter(p => p.trim()).length > 0 && { producers: producers.filter(p => p.trim()) }),
            executive_producer: executiveProducer.trim() || null,
            ...(songwriters.filter(s => s.trim()).length > 0 && { songwriters: songwriters.filter(s => s.trim()) }),
            ...(composers.filter(c => c.trim()).length > 0 && { composers: composers.filter(c => c.trim()) }),
            mixing_engineer: mixingEngineer.trim() || null,
            mastering_engineer: masteringEngineer.trim() || null,
            recording_engineer: recordingEngineer.trim() || null,
            language: language,
            user_id: user.id,
            status: 'draft',
            approved: false
          })
          .select()
          .single();

        if (error) {
          console.error('Database error:', error);
          throw error;
        }
        setReleaseId(release.id);
        // Notify creator of successful draft save
        try {
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: 'Draft saved',
            message: `Your release "${title}" has been saved as a draft.`,
            type: 'success',
            related_id: release.id,
            related_type: 'release'
          });
        } catch {}
      }

      toast({ 
        title: 'Draft saved successfully', 
        description: 'Your release has been saved as a draft. You can now manage splits.' 
      });
      
    } catch (error: any) {
      console.error('Full error details:', error);
      toast({ 
        title: 'Save failed', 
        description: `${error.message} - Check console for details`, 
        variant: 'destructive' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitRelease = async () => {
    if (!user) {
      toast({ title: 'Authentication required', variant: 'destructive' });
      return;
    }

    const errors = validateRelease();
    if (errors.length > 0) {
      toast({ 
        title: 'Validation failed', 
        description: errors.join(', '), 
        variant: 'destructive' 
      });
      return;
    }

    // Show debug info in toast for Lovable environment
    const debugData = {
      title,
      artist,
      price,
      pay_what_you_want: payWhatYouWant,
      minimum_price: minimumPrice,
      status: 'submitted',
      release_date: releaseDate ? releaseDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      user_id: user.id
    };
    
    toast({
      title: 'DEBUG: Attempting submit with data',
      description: JSON.stringify(debugData, null, 2),
      duration: 5000
    });

    setSubmitting(true);
    
    try {
      // Generate preview URL from first track
      const previewUrl = tracks.find(t => t.url)?.url || null;
      
      const releaseData = {
        title,
        artist,
        description,
        genre: primaryGenre || genre, // Use primaryGenre if set, fallback to genre for backwards compatibility
        primary_genre: primaryGenre,
        sub_genre: subGenre,
        release_type: releaseType,
        cover_art_url: coverUrl,
        preview_url: previewUrl,
        download_url: previewUrl, // Use first track as download URL for admin review
        price,
        pay_what_you_want: payWhatYouWant,
        minimum_price: payWhatYouWant ? minimumPrice : null,
        upc_code: upcCode || null,
        isrc_code: isrc || null,
        release_date: releaseDate ? releaseDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        digital_release_date: digitalReleaseDate?.toISOString(),
        distribution_settings: {
          spotify: distributeToSpotify,
          apple_music: distributeToApple,
          youtube_music: distributeToYoutube
        },
        // Credits - with fallback for missing columns
        label: label.trim() || null,
        ...(producers.filter(p => p.trim()).length > 0 && { producers: producers.filter(p => p.trim()) }),
        executive_producer: executiveProducer.trim() || null,
        ...(songwriters.filter(s => s.trim()).length > 0 && { songwriters: songwriters.filter(s => s.trim()) }),
        ...(composers.filter(c => c.trim()).length > 0 && { composers: composers.filter(c => c.trim()) }),
        mixing_engineer: mixingEngineer.trim() || null,
        mastering_engineer: masteringEngineer.trim() || null,
        recording_engineer: recordingEngineer.trim() || null,
        language: language
      };

      let release, releaseError;

      if (isEditMode && releaseId) {
        // First, get the current release to check its status
        const { data: currentRelease } = await supabase
          .from('releases')
          .select('status')
          .eq('id', releaseId)
          .eq('user_id', user.id)
          .single();
        
        // Determine the new status based on current status
        let newStatus = 'submitted';
        if (currentRelease?.status === 'live') {
          // Live releases that are modified need re-approval
          newStatus = 'submitted';
          toast({
            title: 'Live release modified',
            description: 'Your live release has been updated and will need re-approval before going live again.',
            variant: 'default'
          });
        } else if (currentRelease?.status === 'rejected') {
          // Rejected releases being resubmitted
          newStatus = 'submitted';
        } else {
          // Draft or already submitted releases
          newStatus = 'submitted';
        }
        
        // Update existing release with new status
        const updateData = { ...releaseData, status: newStatus, approved: false, updated_at: new Date().toISOString() };
        
        const { data: updatedRelease, error: updateError } = await supabase
          .from('releases')
          .update(updateData)
          .eq('id', releaseId)
          .eq('user_id', user.id)
          .select()
          .single();
        
        release = updatedRelease;
        releaseError = updateError;
        // Notify creator of submission
        if (release && !releaseError) {
          try {
            await supabase.from('notifications').insert({
              user_id: user.id,
              title: 'Release submitted',
              message: `Your release "${title}" has been submitted for review.`,
              type: 'success',
              related_id: release.id,
              related_type: 'release'
            });
          } catch {}
        }
      } else {
        // Create new release for admin review
        const { data: newRelease, error: insertError } = await supabase
          .from('releases')
          .insert({
            ...releaseData,
            user_id: user.id,
            status: 'submitted',
            approved: false
          })
          .select()
          .single();
        
        release = newRelease;
        releaseError = insertError;
        // Notify creator of submission
        if (release && !releaseError) {
          try {
            await supabase.from('notifications').insert({
              user_id: user.id,
              title: 'Release submitted',
              message: `Your release "${title}" has been submitted for review.`,
              type: 'success',
              related_id: release.id,
              related_type: 'release'
            });
          } catch {}
        }
      }

      if (releaseError) {
        // Show detailed error info in toast
        toast({
          title: 'DATABASE ERROR DETAILS',
          description: `Code: ${releaseError.code} | Message: ${releaseError.message} | Details: ${releaseError.details}`,
          variant: 'destructive',
          duration: 10000
        });
        throw releaseError;
      }

      setReleaseId(release.id);

      // Store track information in release metadata
      const trackInfo = tracks
        .filter(t => t.title.trim() && t.url)
        .map((track, index) => ({
          title: track.title,
          track_number: index + 1,
          audio_url: track.url,
          duration: track.duration ? parseInt(track.duration) : null
        }));

      // Save track metadata to tracks table
      if (trackInfo.length > 0 && release?.id) {
        const tracksToInsert = trackInfo.map(track => ({
          ...track,
          release_id: release.id
        }));
        
        // Delete existing tracks if editing
        if (isEditMode) {
          await supabase
            .from('tracks')
            .delete()
            .eq('release_id', release.id);
        }
        
        const { error: tracksError } = await supabase
          .from('tracks')
          .insert(tracksToInsert);
        
        if (tracksError) {
          console.error('Error saving tracks:', tracksError);
          toast({
            title: 'Warning',
            description: 'Release saved but track metadata could not be saved',
            variant: 'destructive'
          });
        }
      }

      // Save collaborators and splits if any exist
      if (collaborators.length > 0 && release?.id) {
        // Delete existing collaborators and splits if editing
        if (isEditMode) {
          await supabase
            .from('collaborators')
            .delete()
            .eq('release_id', release.id);
          // Splits will be cascade deleted due to foreign key
        }

        // Insert collaborators
        const collaboratorsToInsert = collaborators
          .filter(c => c.name.trim())
          .map(collaborator => ({
            release_id: release.id,
            name: collaborator.name.trim(),
            email: collaborator.email?.trim() || null,
            role: collaborator.role,
            role_description: collaborator.role_description?.trim() || null,
            is_external: collaborator.is_external,
            user_id: collaborator.user_id || null
          }));

        const { data: insertedCollaborators, error: collaboratorsError } = await supabase
          .from('collaborators')
          .insert(collaboratorsToInsert)
          .select('id, name, role');

        if (collaboratorsError) {
          console.error('Error saving collaborators:', collaboratorsError);
          toast({
            title: 'Warning',
            description: 'Release saved but collaborators could not be saved',
            variant: 'destructive'
          });
        } else if (insertedCollaborators) {
          // Save splits for each collaborator
          const splitsToInsert: any[] = [];
          
          splits.forEach(split => {
            // Find the corresponding inserted collaborator
            const originalCollaborator = collaborators.find(c => c.id === split.collaborator_id);
            const insertedCollaborator = insertedCollaborators.find(ic => 
              ic.name === originalCollaborator?.name && ic.role === originalCollaborator?.role
            );
            
            if (insertedCollaborator && split.percentage > 0) {
              splitsToInsert.push({
                release_id: release.id,
                collaborator_id: insertedCollaborator.id,
                split_type: split.split_type,
                percentage: split.percentage,
                description: split.description?.trim() || null
              });
            }
          });

          if (splitsToInsert.length > 0) {
            const { error: splitsError } = await supabase
              .from('splits')
              .insert(splitsToInsert);

            if (splitsError) {
              console.error('Error saving splits:', splitsError);
              toast({
                title: 'Warning',
                description: 'Collaborators saved but revenue splits could not be saved',
                variant: 'destructive'
              });
            }
          }
        }
      }

      // Update release with featured artists array and ownership confirmation
      if (release?.id) {
        const updateData: any = {
          featured_artists: featuredArtists.filter(artist => artist.trim()),
          owns_100_percent: owns100Percent,
          distribution_rights_confirmed: distributionRightsConfirmed
        };

        await supabase
          .from('releases')
          .update(updateData)
          .eq('id', release.id);
      }

      toast({ 
        title: isEditMode ? 'Release updated' : 'Release submitted for review', 
        description: isEditMode 
          ? 'Your changes have been saved and submitted for review.' 
          : 'Your release has been submitted to our team for approval. You will be notified once reviewed.' 
      });
      
      // Only reset form if creating new release (not editing)
      if (!isEditMode) {
        setTitle('');
        setArtist('');
        setDescription('');
        setGenre('');
        setReleaseType('Single');
        setPrice(0);
        setPayWhatYouWant(false);
        setMinimumPrice(0);
        setCoverFile(null);
        setCoverUrl('');
        setTracks([{ id: crypto.randomUUID(), title: '' }]);
        setReleaseDate(undefined);
        setDigitalReleaseDate(undefined);
      }
      
    } catch (error: any) {
      toast({ 
        title: 'Submission failed', 
        description: `${error.message} | Full error: ${JSON.stringify(error)}`, 
        variant: 'destructive',
        duration: 10000
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStageIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {stages.map((stage, index) => (
        <div key={stage.id} className="flex items-center">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full border-2 cursor-pointer transition-colors ${
              currentStage === stage.id
                ? 'bg-primary text-primary-foreground border-primary'
                : currentStage > stage.id
                ? 'bg-green-500 text-white border-green-500'
                : 'border-gray-300 text-gray-400'
            }`}
            onClick={() => goToStage(stage.id)}
          >
            {currentStage > stage.id ? <Check className="w-5 h-5" /> : stage.id}
          </div>
          <div className="ml-3 hidden md:block">
            <div className={`text-sm font-medium ${currentStage >= stage.id ? 'text-foreground' : 'text-muted-foreground'}`}>
              {stage.title}
            </div>
            <div className="text-xs text-muted-foreground">{stage.description}</div>
          </div>
          {index < stages.length - 1 && (
            <div className={`w-12 h-0.5 mx-4 ${currentStage > stage.id ? 'bg-green-500' : 'bg-gray-300'}`} />
          )}
        </div>
      ))}
    </div>
  );

  // Stage content renderer
  const renderBasicInformationStage = () => (
    <div className="space-y-4">
      <PublishAsSelector
        value={publishAs}
        onChange={setPublishAs}
        className="pb-4 border-b"
      />

      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Release title" />
      </div>
      <div>
        <Label htmlFor="artist">Artist</Label>
        <Input id="artist" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Primary artist name" />
      </div>
      <div>
        <Label htmlFor="primaryGenre">Primary Genre</Label>
        <Input id="primaryGenre" value={primaryGenre} onChange={(e) => setPrimaryGenre(e.target.value)} placeholder="e.g., Hip-Hop" />
      </div>
      <div>
        <Label htmlFor="subGenre">Sub-Genre</Label>
        <Input id="subGenre" value={subGenre} onChange={(e) => setSubGenre(e.target.value)} placeholder="e.g., Boom Bap" />
      </div>
      <div>
        <Label htmlFor="releaseType">Release Type</Label>
        <Input id="releaseType" value={releaseType} onChange={(e) => setReleaseType(e.target.value)} placeholder="Single | EP | Album" />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your release" />
      </div>
    </div>
  );

  const renderArtworkAudioStage = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Cover Artwork</Label>
        <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
        <div className="flex gap-2">
          <Button type="button" onClick={uploadCover} disabled={!coverFile}>Upload Cover</Button>
          {coverUrl && <Badge variant="secondary">Uploaded</Badge>}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Tracks</Label>
          <Button type="button" variant="outline" onClick={addTrack}>Add Track</Button>
        </div>
        <div className="space-y-3">
          {tracks.map((t) => (
            <div key={t.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <Input value={t.title} onChange={(e) => updateTrack(t.id, { title: e.target.value })} placeholder="Track title" />
              <Input type="file" accept="audio/*" onChange={(e) => updateTrack(t.id, { file: e.target.files?.[0] || undefined })} />
              <div className="flex gap-2">
                <Button type="button" variant="destructive" onClick={() => removeTrack(t.id)}>Remove</Button>
                {t.uploaded || t.url ? <Badge>Ready</Badge> : null}
              </div>
            </div>
          ))}
        </div>
        <div>
          <Button type="button" onClick={uploadTracks} disabled={uploading}>{uploading ? `Uploading ${Math.round(uploadProgress)}%` : 'Upload Tracks'}</Button>
        </div>
      </div>
    </div>
  );

  const renderCreditsDetailsStage = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="label">Label</Label>
        <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label name (optional)" />
      </div>
      <div className="space-y-2">
        <Label>Producers</Label>
        <div className="space-y-2">
          {producers.map((p, i) => (
            <div key={i} className="flex gap-2">
              <Input value={p} onChange={(e) => updateProducer(i, e.target.value)} placeholder="Producer name" />
              <Button type="button" variant="destructive" onClick={() => removeProducer(i)}>Remove</Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addProducer}>Add Producer</Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Featured Artists</Label>
        <div className="space-y-2">
          {featuredArtists.map((fa, i) => (
            <div key={i} className="flex gap-2">
              <Input value={fa} onChange={(e) => updateFeaturedArtist(i, e.target.value)} placeholder="Featured artist" />
              <Button type="button" variant="destructive" onClick={() => setFeaturedArtists(prev => prev.filter((_, idx) => idx !== i))}>Remove</Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setFeaturedArtists(prev => [...prev, ''])}>Add Featured Artist</Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Ownership</Label>
        <div className="flex items-center gap-2">
          <input id="owns100" type="checkbox" checked={owns100Percent} onChange={(e) => setOwns100Percent(e.target.checked)} />
          <Label htmlFor="owns100">I own 100% of this release</Label>
        </div>
        <div className="flex items-center gap-2">
          <input id="rights" type="checkbox" checked={distributionRightsConfirmed} onChange={(e) => setDistributionRightsConfirmed(e.target.checked)} />
          <Label htmlFor="rights">I confirm I have distribution rights</Label>
        </div>
      </div>
    </div>
  );

  const renderPricingDistributionStage = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="price">Price (USD)</Label>
        <Input id="price" type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(parseFloat(e.target.value || '0'))} />
      </div>
      <div className="flex items-center gap-2">
        <input id="pwyw" type="checkbox" checked={payWhatYouWant} onChange={(e) => setPayWhatYouWant(e.target.checked)} />
        <Label htmlFor="pwyw">Enable Pay What You Want</Label>
      </div>
      {payWhatYouWant && (
        <div>
          <Label htmlFor="minPrice">Minimum Price (USD)</Label>
          <Input id="minPrice" type="number" min={0} step={0.01} value={minimumPrice} onChange={(e) => setMinimumPrice(parseFloat(e.target.value || '0'))} />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="upc">UPC</Label>
          <Input id="upc" value={upcCode} onChange={(e) => setUpcCode(e.target.value)} placeholder="Optional" />
        </div>
        <div>
          <Label htmlFor="isrc">ISRC</Label>
          <Input id="isrc" value={isrc} onChange={(e) => setIsrc(e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Distribute To</Label>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={distributeToSpotify} onChange={(e) => setDistributeToSpotify(e.target.checked)} />
            Spotify
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={distributeToApple} onChange={(e) => setDistributeToApple(e.target.checked)} />
            Apple Music
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={distributeToYoutube} onChange={(e) => setDistributeToYoutube(e.target.checked)} />
            YouTube Music
          </label>
        </div>
      </div>
    </div>
  );

  const renderStageContent = () => {
    switch (currentStage) {
      case 1:
        return renderBasicInformationStage();
      case 2:
        return renderArtworkAudioStage();
      case 3:
        return renderCreditsDetailsStage();
      case 4:
        return renderPricingDistributionStage();
      default:
        return renderBasicInformationStage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-6 h-6" />
            {isEditMode ? `Edit Release: ${title || 'Loading...'}` : 'Release Builder'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {loading && isEditMode && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading release data...</span>
            </div>
          )}
          
          {(!loading || !isEditMode) && (
            <>
              {renderStageIndicator()}
              {renderStageContent()}
              
              {/* Stage Navigation */}
              <div className="flex justify-between items-center pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={prevStage}
                  disabled={currentStage === 1}
                >
                  Previous
                </Button>
                
                <div className="flex gap-2">
                  {currentStage < stages.length ? (
                    <Button onClick={nextStage} disabled={!validateCurrentStage()}>
                      Next
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" disabled={submitting} onClick={saveDraft}>
                        {submitting ? 'Saving...' : 'Save Draft'}
                      </Button>
                      <Button onClick={submitRelease} disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit for Distribution'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
