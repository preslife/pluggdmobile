import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

import {
  Twitter,
  Instagram,
  MessageSquare,
  Hash,
  Crown,
  Mail,
  Calendar,
  Image,
  Video,
  Music,
  Link,
  Zap,
  Eye,
  Send,
  Save,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  X,
  BarChart3
} from 'lucide-react';

interface Platform {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  characterLimit?: number;
  supportsMedia: boolean;
  supportsLinks: boolean;
  features: string[];
}

interface PostVariant {
  platform: string;
  content: string;
  media?: File[];
  scheduledFor?: string;
  hashtags: string[];
  mentions: string[];
  links: string[];
}

interface ContentComposerProps {
  onPostCreated?: (post: any) => void;
  onScheduleCreated?: (schedule: any) => void;
}

const PLATFORMS: Platform[] = [
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: Twitter,
    color: 'bg-black',
    characterLimit: 280,
    supportsMedia: true,
    supportsLinks: true,
    features: ['Text posts', 'Media uploads', 'Hashtags', 'Mentions']
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    characterLimit: 2200,
    supportsMedia: true,
    supportsLinks: false,
    features: ['Feed posts', 'Reels', 'Stories', 'Hashtags']
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: MessageSquare,
    color: 'bg-indigo-500',
    characterLimit: 2000,
    supportsMedia: true,
    supportsLinks: true,
    features: ['Channel posting', 'Embeds', 'Mentions']
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Hash,
    color: 'bg-black',
    characterLimit: 300,
    supportsMedia: true,
    supportsLinks: false,
    features: ['Video posts', 'Hashtags', 'Trending sounds']
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Crown,
    color: 'bg-red-500',
    characterLimit: 5000,
    supportsMedia: true,
    supportsLinks: true,
    features: ['Comments', 'Community posts', 'Shorts']
  },
  {
    id: 'gmail',
    name: 'Gmail',
    icon: Mail,
    color: 'bg-red-600',
    characterLimit: 10000,
    supportsMedia: true,
    supportsLinks: true,
    features: ['Email campaigns', 'Newsletters', 'Announcements']
  }
];

export const ContentComposer: React.FC<ContentComposerProps> = ({
  onPostCreated,
  onScheduleCreated
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Main content state
  const [baseContent, setBaseContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [postVariants, setPostVariants] = useState<Record<string, PostVariant>>({});
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [loading, setLoading] = useState(false);

  // Media state
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreview, setMediaPreview] = useState<string[]>([]);

  // Analytics state
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [utmSource, setUtmSource] = useState('pluggd');
  const [utmCampaign, setUtmCampaign] = useState('');

  useEffect(() => {
    // Initialize variants for selected platforms
    const newVariants: Record<string, PostVariant> = {};
    selectedPlatforms.forEach(platformId => {
      if (!postVariants[platformId]) {
        newVariants[platformId] = {
          platform: platformId,
          content: baseContent,
          hashtags: [],
          mentions: [],
          links: []
        };
      }
    });
    setPostVariants(prev => ({ ...prev, ...newVariants }));
  }, [selectedPlatforms, baseContent]);

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const updateVariantContent = (platformId: string, content: string) => {
    setPostVariants(prev => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        content
      }
    }));
  };

  const addHashtag = (platformId: string, hashtag: string) => {
    if (!hashtag.startsWith('#')) hashtag = '#' + hashtag;
    setPostVariants(prev => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        hashtags: [...(prev[platformId]?.hashtags || []), hashtag]
      }
    }));
  };

  const removeHashtag = (platformId: string, hashtag: string) => {
    setPostVariants(prev => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        hashtags: (prev[platformId]?.hashtags || []).filter(h => h !== hashtag)
      }
    }));
  };

  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setMediaFiles(prev => [...prev, ...files]);
    
    // Create preview URLs
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      setMediaPreview(prev => [...prev, url]);
    });
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreview(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const getCharacterCount = (platformId: string) => {
    const platform = PLATFORMS.find(p => p.id === platformId);
    const variant = postVariants[platformId];
    if (!platform || !variant) return 0;
    
    const content = variant.content + ' ' + variant.hashtags.join(' ');
    return content.length;
  };

  const getCharacterLimit = (platformId: string) => {
    const platform = PLATFORMS.find(p => p.id === platformId);
    return platform?.characterLimit || 1000;
  };

  const isOverLimit = (platformId: string) => {
    return getCharacterCount(platformId) > getCharacterLimit(platformId);
  };

  const handlePost = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to post content",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Create post record
      const { data: postData, error: postError } = await supabase
        .from('social_posts')
        .insert({
          creator_id: user.id,
          base_content: baseContent,
          platforms: selectedPlatforms,
          variants: postVariants,
          media_files: mediaFiles.map(f => f.name),
          is_scheduled: isScheduling,
          scheduled_for: isScheduling ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString() : null,
          tracking_enabled: trackingEnabled,
          utm_source: utmSource,
          utm_campaign: utmCampaign,
          status: isScheduling ? 'scheduled' : 'draft'
        })
        .select()
        .single();

      if (postError) throw postError;

      // Upload media files
      if (mediaFiles.length > 0) {
        const uploadPromises = mediaFiles.map(async (file, index) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${postData.id}_${index}.${fileExt}`;
          const filePath = `social-media/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('social-media')
            .upload(filePath, file);
          
          if (uploadError) throw uploadError;
          return filePath;
        });

        await Promise.all(uploadPromises);
      }

      // If scheduling, create automation
      if (isScheduling) {
        const { error: scheduleError } = await supabase
          .from('automations')
          .insert({
            creator_id: user.id,
            title: `Scheduled post - ${new Date(scheduleDate).toLocaleDateString()}`,
            automation_type: 'scheduled_post',
            config_json: {
              post_id: postData.id,
              platforms: selectedPlatforms,
              scheduled_for: new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
            },
            is_enabled: true,
            next_run_at: new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
          });

        if (scheduleError) throw scheduleError;
      }

      toast({
        title: "Success!",
        description: isScheduling ? "Post scheduled successfully" : "Post created successfully"
      });

      // Reset form
      setBaseContent('');
      setSelectedPlatforms([]);
      setPostVariants({});
      setMediaFiles([]);
      setMediaPreview([]);
      setIsScheduling(false);

      if (onPostCreated) onPostCreated(postData);
      if (isScheduling && onScheduleCreated) onScheduleCreated(postData);

    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Content Composer
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Create content once, adapt for each platform, and schedule or post immediately
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Platform Selection */}
          <div className="space-y-3">
            <Label>Select Platforms</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PLATFORMS.map(platform => {
                const Icon = platform.icon;
                const isSelected = selectedPlatforms.includes(platform.id);
                return (
                  <Button
                    key={platform.id}
                    variant={isSelected ? "default" : "outline"}
                    className={`h-auto p-4 flex flex-col gap-2 ${isSelected ? platform.color : ''}`}
                    onClick={() => handlePlatformToggle(platform.id)}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{platform.name}</span>
                    <div className="flex flex-wrap gap-1">
                      {platform.features.slice(0, 2).map(feature => (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Base Content */}
          <div className="space-y-3">
            <Label>Base Content</Label>
            <Textarea
              placeholder="Write your content here... This will be adapted for each platform."
              value={baseContent}
              onChange={(e) => setBaseContent(e.target.value)}
              className="min-h-32"
            />
          </div>

          {/* Media Upload */}
          <div className="space-y-3">
            <Label>Media Files</Label>
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept="image/*,video/*,audio/*"
                multiple
                onChange={handleMediaUpload}
                className="flex-1"
              />
              <Button variant="outline" size="sm">
                <Image className="w-4 h-4 mr-2" />
                Add Media
              </Button>
            </div>
            
            {mediaPreview.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {mediaPreview.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-20 object-cover rounded border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeMedia(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Platform-Specific Variants */}
          {selectedPlatforms.length > 0 && (
            <Tabs defaultValue={selectedPlatforms[0]} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
                {selectedPlatforms.map(platformId => {
                  const platform = PLATFORMS.find(p => p.id === platformId);
                  const Icon = platform?.icon || Hash;
                  return (
                    <TabsTrigger key={platformId} value={platformId} className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {platform?.name}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {selectedPlatforms.map(platformId => {
                const platform = PLATFORMS.find(p => p.id === platformId);
                const variant = postVariants[platformId];
                const characterCount = getCharacterCount(platformId);
                const characterLimit = getCharacterLimit(platformId);
                const isOver = isOverLimit(platformId);

                return (
                  <TabsContent key={platformId} value={platformId} className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Content for {platform?.name}</Label>
                        <div className={`text-sm ${isOver ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {characterCount}/{characterLimit}
                        </div>
                      </div>
                      
                      <Textarea
                        value={variant?.content || ''}
                        onChange={(e) => updateVariantContent(platformId, e.target.value)}
                        className={`min-h-24 ${isOver ? 'border-red-500' : ''}`}
                        placeholder={`Write content optimized for ${platform?.name}...`}
                      />
                    </div>

                    {/* Hashtags */}
                    <div className="space-y-2">
                      <Label>Hashtags</Label>
                      <div className="flex flex-wrap gap-2">
                        {variant?.hashtags.map((hashtag, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {hashtag}
                            <X 
                              className="w-3 h-3 cursor-pointer" 
                              onClick={() => removeHashtag(platformId, hashtag)}
                            />
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add hashtag"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const input = e.target as HTMLInputElement;
                              if (input.value.trim()) {
                                addHashtag(platformId, input.value.trim());
                                input.value = '';
                              }
                            }
                          }}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            if (input.value.trim()) {
                              addHashtag(platformId, input.value.trim());
                              input.value = '';
                            }
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Platform Features */}
                    <div className="space-y-2">
                      <Label>Platform Features</Label>
                      <div className="flex flex-wrap gap-2">
                        {platform?.features.map(feature => (
                          <Badge key={feature} variant="outline">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}

          {/* Scheduling Options */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="schedule"
                checked={isScheduling}
                onCheckedChange={setIsScheduling}
              />
              <Label htmlFor="schedule">Schedule this post</Label>
            </div>

            {isScheduling && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Analytics & Tracking */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="tracking"
                checked={trackingEnabled}
                onCheckedChange={setTrackingEnabled}
              />
              <Label htmlFor="tracking">Enable tracking & analytics</Label>
            </div>

            {trackingEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>UTM Source</Label>
                  <Input
                    value={utmSource}
                    onChange={(e) => setUtmSource(e.target.value)}
                    placeholder="pluggd"
                  />
                </div>
                <div className="space-y-2">
                  <Label>UTM Campaign</Label>
                  <Input
                    value={utmCampaign}
                    onChange={(e) => setUtmCampaign(e.target.value)}
                    placeholder="new-release"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button 
              onClick={handlePost} 
              disabled={loading || selectedPlatforms.length === 0 || baseContent.trim() === ''}
              className="min-w-32"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              ) : isScheduling ? (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Post Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentComposer;
