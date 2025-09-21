import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Store, 
  Palette, 
  Layout,
  Image,
  Link,
  Globe,
  Eye,
  Edit,
  Save,
  Upload,
  Music,
  ShoppingBag,
  Sparkles,
  Settings,
  ExternalLink,
  Plus
} from 'lucide-react';
import { Instagram, Twitter, Youtube } from 'lucide-react';

interface StorefrontSettings {
  theme: 'light' | 'dark' | 'custom';
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  layout: 'grid' | 'list' | 'masonry';
  showBanner: boolean;
  bannerImage?: string;
  bannerText?: string;
  featuredSection: boolean;
  testimonials: boolean;
  newsletter: boolean;
}

interface ProfileSettings {
  username: string;
  displayName: string;
  bio: string;
  avatar?: string;
  coverImage?: string;
  location?: string;
  website?: string;
  socialLinks: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    spotify?: string;
    soundcloud?: string;
  };
  badges: string[];
  customUrl?: string;
}

/**
 * EnhancedStorefrontModule - Customize public storefront and profile
 * This is the creator's public-facing page customization
 */
export const EnhancedStorefrontModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  
  const [storefrontSettings, setStorefrontSettings] = useState<StorefrontSettings>({
    theme: 'dark',
    primaryColor: '#8B5CF6',
    accentColor: '#EC4899',
    fontFamily: 'Inter',
    layout: 'grid',
    showBanner: true,
    featuredSection: true,
    testimonials: true,
    newsletter: true
  });
  
  const [profileSettings, setProfileSettings] = useState<ProfileSettings>({
    username: '',
    displayName: '',
    bio: '',
    location: '',
    website: '',
    socialLinks: {},
    badges: [],
    customUrl: ''
  });

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profile) {
        setProfileSettings({
          username: profile.username || '',
          displayName: profile.full_name || '',
          bio: profile.bio || '',
          avatar: profile.avatar_url,
          coverImage: profile.cover_image_url,
          location: profile.location,
          website: profile.website_url,
          socialLinks: profile.social_links || {},
          badges: profile.is_verified ? ['verified'] : [],
          customUrl: profile.custom_url
        });
      }
      
      // Fetch storefront settings (would come from a settings table)
      // For now using defaults
      
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error loading settings",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: profileSettings.username,
          full_name: profileSettings.displayName,
          bio: profileSettings.bio,
          avatar_url: profileSettings.avatar,
          cover_image_url: profileSettings.coverImage,
          location: profileSettings.location,
          website_url: profileSettings.website,
          social_links: profileSettings.socialLinks,
          custom_url: profileSettings.customUrl
        })
        .eq('user_id', user.id);
      
      if (profileError) throw profileError;
      
      // Save storefront settings (would save to settings table)
      
      toast({
        title: "Settings saved",
        description: "Your storefront and profile have been updated",
      });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (type: 'avatar' | 'cover' | 'banner') => {
    // Implement image upload logic
    toast({
      title: "Upload started",
      description: "Image upload functionality coming soon",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Storefront & Profile</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-secondary rounded" />
          <div className="h-64 bg-secondary rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Storefront & Profile</h1>
          <p className="text-muted-foreground">Customize your public creator page</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => window.open(`/creator/${profileSettings.username}`, '_blank')}
          >
            <Eye className="w-4 h-4 mr-2" />
            View Live
          </Button>
          <Button onClick={handleSaveSettings} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Preview URL */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Your creator page:</span>
            <code className="px-2 py-1 bg-secondary rounded text-sm">
              pluggd.fm/{profileSettings.customUrl || profileSettings.username}
            </code>
            <Button variant="ghost" size="sm">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile Info</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="sections">Page Sections</TabsTrigger>
          <TabsTrigger value="links">Links & Social</TabsTrigger>
          <TabsTrigger value="seo">SEO & Meta</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Basic information about you and your brand</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={profileSettings.username}
                    onChange={(e) => setProfileSettings(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="your-username"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This appears in your URL
                  </p>
                </div>
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={profileSettings.displayName}
                    onChange={(e) => setProfileSettings(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Your Artist Name"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileSettings.bio}
                  onChange={(e) => setProfileSettings(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell your story..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {profileSettings.bio.length}/500 characters
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profileSettings.location}
                    onChange={(e) => setProfileSettings(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Los Angeles, CA"
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={profileSettings.website}
                    onChange={(e) => setProfileSettings(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
              
              {/* Profile Images */}
              <div className="space-y-4">
                <div>
                  <Label>Profile Picture</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center">
                      {profileSettings.avatar ? (
                        <img src={profileSettings.avatar} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <Image className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <Button variant="outline" onClick={() => handleImageUpload('avatar')}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Avatar
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label>Cover Image</Label>
                  <div className="mt-2">
                    <div className="w-full h-32 bg-secondary rounded-lg flex items-center justify-center">
                      {profileSettings.coverImage ? (
                        <img src={profileSettings.coverImage} className="w-full h-full rounded-lg object-cover" />
                      ) : (
                        <Image className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <Button variant="outline" className="mt-2" onClick={() => handleImageUpload('cover')}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Cover
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visual Customization</CardTitle>
              <CardDescription>Customize the look and feel of your page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Theme</Label>
                <Select 
                  value={storefrontSettings.theme}
                  onValueChange={(value: any) => setStorefrontSettings(prev => ({ ...prev, theme: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={storefrontSettings.primaryColor}
                      onChange={(e) => setStorefrontSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-16 h-10"
                    />
                    <Input
                      value={storefrontSettings.primaryColor}
                      onChange={(e) => setStorefrontSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                      placeholder="#8B5CF6"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={storefrontSettings.accentColor}
                      onChange={(e) => setStorefrontSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                      className="w-16 h-10"
                    />
                    <Input
                      value={storefrontSettings.accentColor}
                      onChange={(e) => setStorefrontSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                      placeholder="#EC4899"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Content Layout</Label>
                <Select 
                  value={storefrontSettings.layout}
                  onValueChange={(value: any) => setStorefrontSettings(prev => ({ ...prev, layout: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grid View</SelectItem>
                    <SelectItem value="list">List View</SelectItem>
                    <SelectItem value="masonry">Masonry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Font Family</Label>
                <Select 
                  value={storefrontSettings.fontFamily}
                  onValueChange={(value) => setStorefrontSettings(prev => ({ ...prev, fontFamily: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter</SelectItem>
                    <SelectItem value="Roboto">Roboto</SelectItem>
                    <SelectItem value="Poppins">Poppins</SelectItem>
                    <SelectItem value="Montserrat">Montserrat</SelectItem>
                    <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Page Sections</CardTitle>
              <CardDescription>Choose which sections to display on your page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Hero Banner</p>
                    <p className="text-sm text-muted-foreground">Large banner at the top of your page</p>
                  </div>
                  <Switch 
                    checked={storefrontSettings.showBanner}
                    onCheckedChange={(checked) => setStorefrontSettings(prev => ({ ...prev, showBanner: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Featured Content</p>
                    <p className="text-sm text-muted-foreground">Highlight your best work</p>
                  </div>
                  <Switch 
                    checked={storefrontSettings.featuredSection}
                    onCheckedChange={(checked) => setStorefrontSettings(prev => ({ ...prev, featuredSection: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Testimonials</p>
                    <p className="text-sm text-muted-foreground">Show reviews and social proof</p>
                  </div>
                  <Switch 
                    checked={storefrontSettings.testimonials}
                    onCheckedChange={(checked) => setStorefrontSettings(prev => ({ ...prev, testimonials: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Newsletter Signup</p>
                    <p className="text-sm text-muted-foreground">Collect email subscribers</p>
                  </div>
                  <Switch 
                    checked={storefrontSettings.newsletter}
                    onCheckedChange={(checked) => setStorefrontSettings(prev => ({ ...prev, newsletter: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Music Player</p>
                    <p className="text-sm text-muted-foreground">Embedded music player</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Merchandise</p>
                    <p className="text-sm text-muted-foreground">Display your merch products</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Upcoming Events</p>
                    <p className="text-sm text-muted-foreground">Show your event calendar</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Links & Social Media</CardTitle>
              <CardDescription>Connect your social accounts and external links</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <div className="flex gap-2 mt-2">
                    <Instagram className="w-5 h-5 mt-2 text-muted-foreground" />
                    <Input
                      id="instagram"
                      value={profileSettings.socialLinks.instagram || ''}
                      onChange={(e) => setProfileSettings(prev => ({ 
                        ...prev, 
                        socialLinks: { ...prev.socialLinks, instagram: e.target.value }
                      }))}
                      placeholder="@yourusername"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="twitter">Twitter/X</Label>
                  <div className="flex gap-2 mt-2">
                    <Twitter className="w-5 h-5 mt-2 text-muted-foreground" />
                    <Input
                      id="twitter"
                      value={profileSettings.socialLinks.twitter || ''}
                      onChange={(e) => setProfileSettings(prev => ({ 
                        ...prev, 
                        socialLinks: { ...prev.socialLinks, twitter: e.target.value }
                      }))}
                      placeholder="@yourusername"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="youtube">YouTube</Label>
                  <div className="flex gap-2 mt-2">
                    <Youtube className="w-5 h-5 mt-2 text-muted-foreground" />
                    <Input
                      id="youtube"
                      value={profileSettings.socialLinks.youtube || ''}
                      onChange={(e) => setProfileSettings(prev => ({ 
                        ...prev, 
                        socialLinks: { ...prev.socialLinks, youtube: e.target.value }
                      }))}
                      placeholder="Channel URL"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="spotify">Spotify</Label>
                  <div className="flex gap-2 mt-2">
                    <Music className="w-5 h-5 mt-2 text-muted-foreground" />
                    <Input
                      id="spotify"
                      value={profileSettings.socialLinks.spotify || ''}
                      onChange={(e) => setProfileSettings(prev => ({ 
                        ...prev, 
                        socialLinks: { ...prev.socialLinks, spotify: e.target.value }
                      }))}
                      placeholder="Artist ID"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="soundcloud">SoundCloud</Label>
                  <div className="flex gap-2 mt-2">
                    <Music className="w-5 h-5 mt-2 text-muted-foreground" />
                    <Input
                      id="soundcloud"
                      value={profileSettings.socialLinks.soundcloud || ''}
                      onChange={(e) => setProfileSettings(prev => ({ 
                        ...prev, 
                        socialLinks: { ...prev.socialLinks, soundcloud: e.target.value }
                      }))}
                      placeholder="Profile URL"
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-3">Custom Links</h3>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom Link
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SEO & Meta Tags</CardTitle>
              <CardDescription>Optimize your page for search engines</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customUrl">Custom URL Slug</Label>
                <Input
                  id="customUrl"
                  value={profileSettings.customUrl}
                  onChange={(e) => setProfileSettings(prev => ({ ...prev, customUrl: e.target.value }))}
                  placeholder="custom-name"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  pluggd.fm/{profileSettings.customUrl || 'custom-name'}
                </p>
              </div>
              
              <div>
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  placeholder={`${profileSettings.displayName} | Music Producer`}
                />
              </div>
              
              <div>
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  placeholder="A brief description for search engines..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="keywords">Keywords</Label>
                <Input
                  id="keywords"
                  placeholder="music, producer, beats, hip-hop"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated keywords for SEO
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedStorefrontModule;
