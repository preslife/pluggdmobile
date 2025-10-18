import { formatCurrency } from "@/lib/utils";
import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Music, User, Upload, DollarSign, Eye, Play, EyeOff, Crown, Zap, UserCheck, Package, Wallet } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { usePageMetadata } from '@/hooks/usePageMetadata';
// import Navigation from '@/components/Navigation';
import BeatUploadForm from '@/components/BeatUploadForm';
import { ProfileManager } from '@/components/ProfileManager';
import { UserTierCard } from '@/components/UserTierCard';
import MySubscriptionsList from '@/components/MySubscriptionsList';
import CommissionRequestsList from '@/components/CommissionRequestsList';
import { SupportersList } from '@/components/SupportersList';
import EarningsSummaryWidget from '@/components/EarningsSummaryWidget';

import { MyPurchases, MyPlaylists } from '@/components/DashboardTabs';
import { MySubscriptions } from '@/components/MySubscriptions';
import { BadgeShowcase } from '@/components/BadgeShowcase';
import EnhancedProducerDashboard from '@/components/EnhancedProducerDashboard';
import { CreatorDashboard } from '@/components/CreatorDashboard';
import { MyReleasesTab } from '@/components/MyReleasesTab';
import { MyBeatsTab } from '@/components/MyBeatsTab';

type Profile = {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  user_type: 'artist' | 'producer' | 'industry';
  is_creator: boolean;
};

type Beat = {
  id: string;
  title: string;
  description: string;
  genre: string;
  bpm: number;
  key: string;
  price: number;
  tags: string[];
  audio_url: string;
  image_url: string;
  is_published: boolean;
  created_at: string;
};

const Dashboard = () => {
  usePageMetadata({
    title: 'Producer Dashboard — Pluggd',
    description: 'Manage beats, releases, supporters, and monetization tools from the Pluggd producer control center.',
    path: '/producer',
  });

  const { user, loading } = useAuth();
  const { subscription, checkCourseLimit, refreshData } = useSubscription();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingBeats, setLoadingBeats] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [activeTab, setActiveTab] = useState("purchases");

  // Default tab to purchases
  useEffect(() => {
    if (profile && activeTab === "overview") {
      setActiveTab("purchases");
    }
  }, [profile, activeTab]);

  // Get tabs based on user type
  const getTabs = () => {
    const baseTabs = [
      { value: "purchases", label: "My Purchases" },
      { value: "subscriptions", label: "My Subscriptions" },
      { value: "playlists", label: "My Playlists" },
      { value: "badges", label: "XP & Badges" },
      { value: "notifications", label: "Notifications" },
    ];

    // Add producer/creator specific tabs
    if (profile?.user_type === 'producer' || profile?.is_creator) {
      baseTabs.push({ value: "beats", label: "My Beats" });
    }

    // Add Manage Creator Page tab only when is_creator=true
    if (profile?.is_creator) {
      baseTabs.push({ value: "creator", label: "Creator Dashboard" });
    }

    return baseTabs;
  };

  // Redirect if not authenticated
  if (!user && !loading) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchBeats();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchBeats = async () => {
    try {
      const { data, error } = await supabase
        .from('beats')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBeats(data || []);
    } catch (error) {
      console.error('Error fetching beats:', error);
    } finally {
      setLoadingBeats(false);
    }
  };

  const updateProfile = async (updatedProfile: Partial<Profile>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updatedProfile)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      toast({
        title: "Success!",
        description: "Profile updated successfully."
      });
      
      fetchProfile();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive"
      });
    }
  };

  const toggleBeatPublication = async (beatId: string, isPublished: boolean) => {
    try {
      const { error } = await supabase
        .from('beats')
        .update({ is_published: !isPublished })
        .eq('id', beatId);

      if (error) throw error;
      
      toast({
        title: "Success!",
        description: `Beat ${!isPublished ? 'published' : 'unpublished'} successfully.`
      });
      
      fetchBeats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update beat status.",
        variant: "destructive"
      });
    }
  };

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Welcome back, {profile?.full_name || user?.email}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {profile?.is_creator 
                    ? "Manage your purchases, playlists, and creator content." 
                    : "Manage your purchases, subscriptions, and profile."}
                </p>
              </div>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/dashboard/wallet">
                  <Wallet className="h-4 w-4" />
                  Wallet
                </Link>
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex w-full overflow-x-auto">
              <TabsTrigger value="purchases">My Purchases</TabsTrigger>
              <TabsTrigger value="subscriptions">My Subscriptions</TabsTrigger>
              <TabsTrigger value="playlists">My Playlists</TabsTrigger>
              <TabsTrigger value="badges">XP & Badges</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              {(profile?.user_type === 'producer' || profile?.is_creator) && (
                <TabsTrigger value="beats">My Beats</TabsTrigger>
              )}
              {profile?.is_creator && (
                <TabsTrigger value="creator">Creator Dashboard</TabsTrigger>
              )}
            </TabsList>


            <TabsContent value="purchases" className="space-y-6">
              <MyPurchases />
            </TabsContent>

            <TabsContent value="subscriptions" className="space-y-6">
              <MySubscriptions />
            </TabsContent>

            <TabsContent value="playlists" className="space-y-6">
              <MyPlaylists />
            </TabsContent>

            <TabsContent value="badges" className="space-y-6">
              <BadgeShowcase />
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Stay updated with your latest activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No notifications yet.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {(profile?.user_type === 'producer' || profile?.is_creator) && (
              <TabsContent value="beats" className="space-y-6">
                <MyBeatsTab />
              </TabsContent>
            )}

            {profile?.is_creator && (
              <TabsContent value="creator" className="space-y-6">
                <CreatorDashboard />
              </TabsContent>
            )}

          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;