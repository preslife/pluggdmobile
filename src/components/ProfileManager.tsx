import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { User, Camera, Music, DollarSign, Calendar, MapPin, Link as LinkIcon, Upload, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/FileUpload';
import DirectorySubmissionForm from '@/components/DirectorySubmissionForm';

type Profile = {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  user_type: 'artist' | 'producer' | 'industry';
  created_at: string;
  updated_at: string;
};

type DirectorySubmission = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  title: string;
};

type ProfileStats = {
  totalBeats: number;
  totalSales: number;
  totalRevenue: number;
  joinDate: string;
};

interface ProfileManagerProps {
  onProfileUpdate?: () => void;
}

export const ProfileManager = ({ onProfileUpdate }: ProfileManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [directorySubmission, setDirectorySubmission] = useState<DirectorySubmission | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDirectoryForm, setShowDirectoryForm] = useState(false);
  
  // Social stats state
  const [socialStats, setSocialStats] = useState({
    followersCount: 0,
    followingCount: 0,
    beatsCount: 0,
    collaborationsCount: 0,
  });
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: '',
    user_type: 'artist' as 'artist' | 'producer' | 'industry'
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchDirectorySubmission();
      fetchStats();
      fetchSocialStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setProfile(data);
        setFormData({
          username: data.username || '',
          full_name: data.full_name || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
          user_type: data.user_type || 'artist'
        });
      } else {
        // Create profile if it doesn't exist
        await createProfile();
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          user_id: user!.id,
          username: user!.email?.split('@')[0] || '',
          full_name: '',
          bio: '',
          user_type: 'artist'
        }])
         .select()
         .maybeSingle();

       if (error) throw error;
       if (!data) throw new Error('Profile creation failed');
       setProfile(data);
       setFormData({
         username: data.username || '',
         full_name: data.full_name || '',
         bio: data.bio || '',
         avatar_url: data.avatar_url || '',
         user_type: data.user_type || 'artist'
       });
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const fetchDirectorySubmission = async () => {
    try {
      const { data, error } = await supabase
        .from('directory_submissions')
        .select('id, status, created_at, title')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
         .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setDirectorySubmission(data);
    } catch (error) {
      console.error('Error fetching directory submission:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch user's beats count
      const { data: beatsData, error: beatsError } = await supabase
        .from('beats')
        .select('id')
        .eq('user_id', user?.id);

      if (beatsError) throw beatsError;

      // Fetch sales data
      const { data: salesData, error: salesError } = await supabase
        .from('purchases')
        .select('amount, beats!inner(user_id)')
        .eq('beats.user_id', user?.id);

      if (salesError) throw salesError;

      const totalRevenue = salesData?.reduce((sum, sale) => sum + sale.amount, 0) || 0;

      setStats({
        totalBeats: beatsData?.length || 0,
        totalSales: salesData?.length || 0,
        totalRevenue,
        joinDate: user?.created_at || ''
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          full_name: formData.full_name,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
          user_type: formData.user_type,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Profile updated successfully"
      });

      setIsEditing(false);
      await fetchProfile();
      await fetchSocialStats();
      onProfileUpdate?.();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = (url: string) => {
    setFormData(prev => ({ ...prev, avatar_url: url }));
  };

  const getUserTypeBadge = (userType: string) => {
    switch (userType) {
      case 'producer':
        return <Badge variant="default">Producer</Badge>;
      case 'industry':
        return <Badge variant="secondary">Industry Professional</Badge>;
      default:
        return <Badge variant="outline">Artist</Badge>;
    }
  };

  const fetchSocialStats = async () => {
    if (!user) return;
    
    try {
      // Get followers count
      const { count: followersCount } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);

      // Get following count
      const { count: followingCount } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id);

      // Get beats count (for producers)
      const { count: beatsCount } = await supabase
        .from('beats')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_published', true);

      // Get collaborations count
      const { count: collaborationsCount } = await supabase
        .from('collaboration_projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setSocialStats({
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
        beatsCount: beatsCount || 0,
        collaborationsCount: collaborationsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching social stats:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading profile...</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={formData.avatar_url} />
                  <AvatarFallback>
                    <User className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <div className="absolute -bottom-2 -right-2">
                    <FileUpload
                      onUpload={handleAvatarUpload}
                      accept="image/*"
                      bucketName="beat-artwork"
                      maxSizeMB={5}
                      className="w-10 h-10 rounded-full bg-primary text-white border-2 border-white shadow-lg hover:bg-primary/90 transition-all duration-200 flex items-center justify-center cursor-pointer"
                    >
                      <Camera className="w-5 h-5 text-white" />
                    </FileUpload>
                  </div>
                )}
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {profile?.full_name || profile?.username || 'Anonymous User'}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <span>@{profile?.username || 'user'}</span>
                  {getUserTypeBadge(profile?.user_type || 'artist')}
                </CardDescription>
              </div>
            </div>
            <Button
              variant={isEditing ? "outline" : "default"}
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Your username"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="user_type">Account Type</Label>
                <Select 
                  value={formData.user_type} 
                  onValueChange={(value: 'artist' | 'producer' | 'industry') => 
                    setFormData(prev => ({ ...prev, user_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="artist">
                      <div className="space-y-1">
                        <div className="font-medium">Artist</div>
                        <div className="text-xs text-muted-foreground">Access to marketplace, library, collaborate & directory</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="producer">
                      <div className="space-y-1">
                        <div className="font-medium">Producer</div>
                        <div className="text-xs text-muted-foreground">Can upload beats + all artist features</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="industry">
                      <div className="space-y-1">
                        <div className="font-medium">Industry Professional</div>
                        <div className="text-xs text-muted-foreground">Access to marketplace, collaborate & directory</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself and your music..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {profile?.bio || 'No bio yet. Edit your profile to add one!'}
              </p>
              
              {/* Social Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-b">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{socialStats.followersCount}</div>
                  <p className="text-sm text-muted-foreground">Followers</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{socialStats.followingCount}</div>
                  <p className="text-sm text-muted-foreground">Following</p>
                </div>
                {profile?.user_type === 'producer' && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{socialStats.beatsCount}</div>
                    <p className="text-sm text-muted-foreground">Beats</p>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{socialStats.collaborationsCount}</div>
                  <p className="text-sm text-muted-foreground">Projects</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {stats?.joinDate ? new Date(stats.joinDate).toLocaleDateString() : 'Recently'}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Directory Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Professional Directory
          </CardTitle>
          <CardDescription>
            Join our professional directory to get discovered by potential collaborators.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {directorySubmission ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg border">
                <div className="flex-shrink-0">
                  {directorySubmission.status === 'pending' && (
                    <Clock className="h-5 w-5 text-yellow-500" />
                  )}
                  {directorySubmission.status === 'approved' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {directorySubmission.status === 'rejected' && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{directorySubmission.title}</span>
                    <Badge 
                      variant={
                        directorySubmission.status === 'approved' ? 'default' :
                        directorySubmission.status === 'pending' ? 'secondary' : 'destructive'
                      }
                    >
                      {directorySubmission.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Submitted {new Date(directorySubmission.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {directorySubmission.status === 'pending' && (
                <p className="text-sm text-muted-foreground">
                  Your application is being reviewed. You'll be notified once it's processed.
                </p>
              )}
              
              {directorySubmission.status === 'approved' && (
                <p className="text-sm text-green-600">
                  Congratulations! Your profile is now live in the directory.
                </p>
              )}
              
              {directorySubmission.status === 'rejected' && (
                <div className="space-y-2">
                  <p className="text-sm text-red-600">
                    Your application was not approved. You can submit a new application.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDirectoryForm(true)}
                  >
                    Submit New Application
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                You haven't submitted an application to join the directory yet.
              </p>
              <Button 
                onClick={() => setShowDirectoryForm(true)}
                className="w-full"
              >
                Apply to Join Directory
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6 text-center">
              <Music className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{stats.totalBeats}</div>
              <p className="text-sm text-muted-foreground">Beats Created</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">Total Earnings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <LinkIcon className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{stats.totalSales}</div>
              <p className="text-sm text-muted-foreground">Sales Made</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Directory Submission Form Modal */}
      {showDirectoryForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <DirectorySubmissionForm
              onSuccess={() => {
                setShowDirectoryForm(false);
                fetchDirectorySubmission();
                toast({
                  title: "Application Submitted!",
                  description: "Your directory application has been submitted for review."
                });
              }}
              onCancel={() => setShowDirectoryForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};