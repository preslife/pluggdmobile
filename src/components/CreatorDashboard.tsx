import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Download, Music, TrendingUp, Users, DollarSign, Eye, Settings, Edit, Trash2, Code, Palette, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { OnboardingStatus } from './OnboardingStatus';
import { OnboardingChecklist } from './OnboardingChecklist';

interface CreatorPack {
  id: string;
  title: string;
  price: number;
  price_pence?: number;
  cover_art_url: string;
  total_downloads: number;
  total_revenue?: number;
  approval_status?: string;
  is_active?: boolean;
  sample_count: number;
  genre: string;
  created_at: string;
  bpm_range?: string;
  description?: string;
  download_url?: string;
  preview_url?: string;
  is_featured?: boolean;
  user_id: string;
  tags?: string[];
  updated_at?: string;
}

interface CreatorStats {
  totalPacks: number;
  totalDownloads: number;
  totalRevenue: number;
  pendingPacks: number;
}

export const CreatorDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [packs, setPacks] = useState<CreatorPack[]>([]);
  const [stats, setStats] = useState<CreatorStats>({
    totalPacks: 0,
    totalDownloads: 0,
    totalRevenue: 0,
    pendingPacks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCreatorData();
    }
  }, [user]);

  const fetchCreatorData = async () => {
    if (!user) return;

    try {
      // Fetch creator's sample packs
      const { data: packsData, error: packsError } = await supabase
        .from('sample_packs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (packsError) throw packsError;

      setPacks((packsData || []) as CreatorPack[]);

      // Calculate stats
      const totalPacks = packsData?.length || 0;
      const totalDownloads = packsData?.reduce((sum, pack) => sum + (pack.total_downloads || 0), 0) || 0;
      const totalRevenue = packsData?.reduce((sum, pack) => sum + ((pack as any).total_revenue || 0), 0) || 0;
      const pendingPacks = packsData?.filter(pack => (pack as any).approval_status === 'pending').length || 0;

      setStats({
        totalPacks,
        totalDownloads,
        totalRevenue,
        pendingPacks
      });
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePack = async (packId: string) => {
    try {
      const { error } = await supabase
        .from('sample_packs')
        .delete()
        .eq('id', packId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Pack deleted",
        description: "Your sample pack has been deleted"
      });

      fetchCreatorData();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const setupStripeConnect = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Setup failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your sample packs and track your earnings
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => navigate('/studio')} variant="default">
            <Zap className="w-4 h-4 mr-2" />
            Creator Studio
          </Button>
          <Button onClick={() => navigate('/dashboard/creator/developer')} variant="outline">
            <Code className="w-4 h-4 mr-2" />
            API & Developer
          </Button>
          <Button onClick={() => navigate('/dashboard/creator/embeds')} variant="outline">
            <Palette className="w-4 h-4 mr-2" />
            Embed Gallery
          </Button>
          <Button onClick={setupStripeConnect} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Setup Payouts
          </Button>
          <Button onClick={() => navigate('/sample-pack/upload')} variant="outline">
            <Music className="w-4 h-4 mr-2" />
            Upload Sample Pack
          </Button>
          <Button onClick={() => navigate('/producer')}>
            <Music className="w-4 h-4 mr-2" />
            Upload Beat
          </Button>
        </div>
      </div>

      {/* Onboarding Status */}
      <OnboardingStatus />

      {/* Onboarding Checklist - always show for task completion */}
      <OnboardingChecklist />

      {/* Quick Actions Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Jump to key features and tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              variant="ghost" 
              className="h-auto p-4 flex-col gap-2"
              onClick={() => navigate('/dashboard/creator/developer')}
            >
              <Code className="h-6 w-6" />
              <span className="text-sm">API Access</span>
            </Button>
            <Button 
              variant="ghost" 
              className="h-auto p-4 flex-col gap-2"
              onClick={() => navigate('/dashboard/creator/embeds')}
            >
              <Palette className="h-6 w-6" />
              <span className="text-sm">Embed Players</span>
            </Button>
            <Button 
              variant="ghost" 
              className="h-auto p-4 flex-col gap-2"
              onClick={() => navigate('/dashboard/creator/analytics')}
            >
              <TrendingUp className="h-6 w-6" />
              <span className="text-sm">Analytics</span>
            </Button>
            <Button 
              variant="ghost" 
              className="h-auto p-4 flex-col gap-2"
              onClick={() => navigate('/help')}
            >
              <Settings className="h-6 w-6" />
              <span className="text-sm">Help & Support</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Packs</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPacks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingPacks} pending approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDownloads}</div>
            <p className="text-xs text-muted-foreground">
              Across all packs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Before platform fees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalPacks > 0 ? Math.round(((stats.totalPacks - stats.pendingPacks) / stats.totalPacks) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Approved packs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Packs Management */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Packs</TabsTrigger>
          <TabsTrigger value="pending">Pending ({stats.pendingPacks})</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packs.map((pack) => (
              <Card key={pack.id} className="overflow-hidden">
                <div className="aspect-square relative">
                  {pack.cover_art_url ? (
                    <img
                      src={pack.cover_art_url}
                      alt={pack.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Music className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="absolute top-2 left-2">
                    <Badge 
                      variant={(pack.approval_status || 'pending') === 'approved' ? 'default' : 
                               (pack.approval_status || 'pending') === 'pending' ? 'secondary' : 'destructive'}
                    >
                      {pack.approval_status || 'pending'}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div>
                      <h3 className="font-medium leading-tight">{pack.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {pack.genre} • {pack.sample_count} samples
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-bold">
                        {(pack.price_pence || 0) > 0 ? `£${((pack.price_pence || 0) / 100).toFixed(2)}` : 'Free'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {pack.total_downloads} downloads
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deletePack(pack.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {packs.length === 0 && (
            <Card className="p-8 text-center">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No sample packs yet</h3>
              <p className="text-muted-foreground mb-4">
                Start earning by uploading your first sample pack
              </p>
              <Button onClick={() => navigate('/sample-pack/upload')}>
                Upload Sample Pack
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pending">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packs.filter(pack => pack.approval_status === 'pending').map((pack) => (
              <Card key={pack.id} className="overflow-hidden">
                {/* Same card structure as above */}
                <div className="aspect-square relative">
                  {pack.cover_art_url ? (
                    <img src={pack.cover_art_url} alt={pack.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Music className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary">Pending Review</Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium">{pack.title}</h3>
                  <p className="text-sm text-muted-foreground">Awaiting approval</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packs.filter(pack => pack.approval_status === 'approved' && pack.is_active).map((pack) => (
              <Card key={pack.id} className="overflow-hidden">
                {/* Same card structure as above */}
                <div className="aspect-square relative">
                  {pack.cover_art_url ? (
                    <img src={pack.cover_art_url} alt={pack.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Music className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium">{pack.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {pack.total_downloads} downloads • £{pack.total_revenue?.toFixed(2) || '0.00'} earned
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};