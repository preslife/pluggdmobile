import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Globe, Music, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';

type Platform = {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'pending';
  description: string;
  distribution_fee: number;
};

type DistributionStatus = {
  id: string;
  release_id: string;
  platform: string;
  status: 'pending' | 'processing' | 'live' | 'failed' | 'rejected';
  submitted_at: string;
  live_date?: string;
  error_message?: string;
  external_url?: string;
  streams?: number;
  revenue?: number;
};

type Release = {
  id: string;
  title: string;
  artist: string;
  cover_art_url?: string;
  isrc_code?: string;
  genre: string;
  release_date: string;
};

const DistributionManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [distributionStatus, setDistributionStatus] = useState<DistributionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Mock platforms data
      const mockPlatforms: Platform[] = [
        {
          id: 'spotify',
          name: 'Spotify',
          icon: '🎵',
          enabled: true,
          status: 'connected',
          description: 'Stream to millions worldwide',
          distribution_fee: 5.0
        },
        {
          id: 'apple-music',
          name: 'Apple Music',
          icon: '🍎',
          enabled: true,
          status: 'connected',
          description: 'Reach Apple Music listeners',
          distribution_fee: 5.0
        },
        {
          id: 'youtube-music',
          name: 'YouTube Music',
          icon: '▶️',
          enabled: false,
          status: 'disconnected',
          description: 'Video and audio streaming',
          distribution_fee: 4.0
        },
        {
          id: 'soundcloud',
          name: 'SoundCloud',
          icon: '☁️',
          enabled: true,
          status: 'connected',
          description: 'Independent creator platform',
          distribution_fee: 3.0
        },
        {
          id: 'bandcamp',
          name: 'Bandcamp',
          icon: '💿',
          enabled: false,
          status: 'disconnected',
          description: 'Direct fan sales',
          distribution_fee: 6.0
        }
      ];
      setPlatforms(mockPlatforms);

      // Mock releases data
      const mockReleases: Release[] = [
        {
          id: '1',
          title: 'Sample Track',
          artist: 'Demo Artist',
          genre: 'Hip Hop',
          release_date: new Date().toISOString(),
          isrc_code: 'US-XYZ-23-00001'
        }
      ];
      setReleases(mockReleases);

      // Mock distribution status
      const mockStatus: DistributionStatus[] = [
        {
          id: '1',
          release_id: '1',
          platform: 'spotify',
          status: 'live',
          submitted_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          live_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          external_url: 'https://open.spotify.com/track/example',
          streams: 1250,
          revenue: 4.25
        },
        {
          id: '2',
          release_id: '1',
          platform: 'apple-music',
          status: 'processing',
          submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      setDistributionStatus(mockStatus);
    } catch (error) {
      console.error('Error fetching distribution data:', error);
    } finally {
      setLoading(false);
    }
  };

  const distributeToAll = async (release: Release) => {
    if (!user) return;

    try {
      const enabledPlatforms = platforms.filter(p => p.enabled && p.status === 'connected');
      
      // Simulate distribution process
      for (const platform of enabledPlatforms) {
        // Create pending status
        const newStatus: DistributionStatus = {
          id: Math.random().toString(),
          release_id: release.id,
          platform: platform.id,
          status: 'pending',
          submitted_at: new Date().toISOString()
        };
        
        setDistributionStatus(prev => [...prev, newStatus]);
      }

      toast({
        title: "Distribution Started",
        description: `${release.title} is being distributed to ${enabledPlatforms.length} platforms (demo mode).`
      });
    } catch (error) {
      toast({
        title: "Distribution Failed",
        description: "Failed to start distribution process.",
        variant: "destructive"
      });
    }
  };

  const retryDistribution = async (statusId: string) => {
    try {
      toast({
        title: "Retrying Distribution",
        description: "Distribution retry initiated (demo mode)."
      });
    } catch (error) {
      toast({
        title: "Retry Failed",
        description: "Failed to retry distribution.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Live</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'failed':
      case 'rejected':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
        <p className="text-muted-foreground">Please sign in to manage distribution.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-24 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" />
          Distribution Manager
        </h2>
        <p className="text-muted-foreground">Distribute your music to streaming platforms worldwide</p>
      </div>

      {/* Platform Status */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Connected Platforms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platforms.map((platform) => (
              <div key={platform.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{platform.icon}</span>
                  <div>
                    <p className="font-medium">{platform.name}</p>
                    <p className="text-xs text-muted-foreground">{platform.distribution_fee}% fee</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={platform.status === 'connected' ? 'default' : 'secondary'}
                  >
                    {platform.status}
                  </Badge>
                  {platform.enabled && (
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Enabled
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Releases for Distribution */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Your Releases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {releases.map((release) => (
              <div key={release.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                    {release.cover_art_url ? (
                      <img 
                        src={release.cover_art_url} 
                        alt={release.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Music className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{release.title}</h3>
                    <p className="text-sm text-muted-foreground">{release.artist}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{release.genre}</Badge>
                      {release.isrc_code && (
                        <Badge variant="secondary" className="text-xs">
                          {release.isrc_code}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedRelease(release)}
                  >
                    View Status
                  </Button>
                  <Button 
                    variant="hero" 
                    size="sm"
                    onClick={() => distributeToAll(release)}
                  >
                    Distribute to All
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distribution Status */}
      {selectedRelease && (
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle>Distribution Status - {selectedRelease.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {distributionStatus
                .filter(status => status.release_id === selectedRelease.id)
                .map((status) => {
                  const platform = platforms.find(p => p.id === status.platform);
                  return (
                    <div key={status.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{platform?.icon}</span>
                        <div>
                          <p className="font-medium">{platform?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Submitted: {new Date(status.submitted_at).toLocaleDateString()}
                          </p>
                          {status.live_date && (
                            <p className="text-sm text-muted-foreground">
                              Live: {new Date(status.live_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {status.streams && (
                          <div className="text-right">
                            <p className="text-sm font-medium">{status.streams.toLocaleString()} streams</p>
                            <p className="text-sm text-muted-foreground">£{status.revenue?.toFixed(2)} revenue</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {getStatusBadge(status.status)}
                          {status.status === 'failed' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => retryDistribution(status.id)}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                          {status.external_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={status.external_url} target="_blank" rel="noopener noreferrer">
                                View on Platform
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
            
            {distributionStatus.filter(s => s.release_id === selectedRelease.id).length === 0 && (
              <div className="text-center py-8">
                <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">This release hasn't been distributed yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {releases.length === 0 && (
        <div className="text-center py-12">
          <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No releases available</h3>
          <p className="text-muted-foreground">Upload releases to start distributing to streaming platforms.</p>
        </div>
      )}
    </div>
  );
};

export default DistributionManager;