import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit3, Trash2, Music, Download, ExternalLink, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Playlist {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface Purchase {
  id: string;
  release_id: string;
  amount_paid: number;
  purchased_at: string;
  download_expires_at: string;
  downloads_used: number;
  download_url: string;
  release: {
    title: string;
    artist: string;
    cover_art_url: string;
  };
}

interface Subscription {
  id: string;
  creator_id: string;
  status: string;
  price_cents: number;
  created_at: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

export const MyPurchases = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchases();
  }, [user]);

  const fetchPurchases = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('release_purchases')
        .select(`
          *,
          release:releases(title, artist, cover_art_url)
        `)
        .eq('user_id', user.id)
        .order('purchased_at', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your purchases',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (purchaseId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('download-signed-url', {
        body: {
          purchaseId,
          purchaseType: 'release'
        }
      });

      if (error) throw error;

      // Open download in new tab
      const signedUrl: string | undefined = data?.signedUrl ?? data?.downloadUrl;
      if (!signedUrl) {
        throw new Error('Download link unavailable. Please try again later.');
      }

      window.open(signedUrl, '_blank');

      toast({
        title: 'Download Started',
        description: 'Your download should begin shortly',
      });
    } catch (error) {
      console.error('Error downloading:', error);
      toast({
        title: 'Download Failed',
        description: 'Unable to download the file. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading your purchases...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Purchases</h2>
        <Badge variant="secondary">{purchases.length} items</Badge>
      </div>

      {purchases.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Download className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No purchases yet</h3>
            <p className="text-muted-foreground mb-4">
              Explore our releases and find music you love!
            </p>
            <Button onClick={() => window.location.href = '/releases'}>
              Browse Releases
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {purchases.map((purchase) => (
            <Card key={purchase.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    {purchase.release?.cover_art_url ? (
                      <img
                        src={purchase.release.cover_art_url}
                        alt={purchase.release.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold">{purchase.release?.title}</h3>
                    <p className="text-sm text-muted-foreground">{purchase.release?.artist}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Purchased: {new Date(purchase.purchased_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Price: {formatCurrency(purchase.amount_paid)}</span>
                      <span>•</span>
                      <span>Downloads: {purchase.downloads_used}/3</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {(!purchase.download_expires_at || new Date(purchase.download_expires_at) > new Date()) ? (
                      <Button
                        size="sm"
                        onClick={() => handleDownload(purchase.id)}
                        disabled={purchase.downloads_used >= 3}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    ) : (
                      <Badge variant="destructive">
                        <Clock className="w-3 h-3 mr-1" />
                        Expired
                      </Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={() => window.location.href = `/release/${purchase.release_id}`}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export const MySubscriptions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptions();
  }, [user]);

  const fetchSubscriptions = async () => {
    if (!user) return;

    try {
      // Use a simpler query structure that works with the existing schema
      const { data, error } = await supabase
        .from('fan_subscriptions')
        .select('*')
        .eq('fan_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Then fetch creator profiles separately
      const subscriptionsWithProfiles = await Promise.all(
        (data || []).map(async (subscription) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url')
            .eq('user_id', subscription.creator_id)
            .single();
          
          return { ...subscription, profiles: profile };
        })
      );
      
      setSubscriptions(subscriptionsWithProfiles);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your subscriptions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('fan_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast({
        title: 'Subscription Cancelled',
        description: 'Your subscription has been cancelled successfully',
      });

      fetchSubscriptions();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading your subscriptions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Subscriptions</h2>
        <Badge variant="secondary">{subscriptions.length} active</Badge>
      </div>

      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No subscriptions yet</h3>
            <p className="text-muted-foreground mb-4">
              Subscribe to your favorite creators to get exclusive content!
            </p>
            <Button onClick={() => window.location.href = '/community'}>
              Browse Creators
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {subscriptions.map((subscription) => (
            <Card key={subscription.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                    {subscription.profiles?.avatar_url ? (
                      <img
                        src={subscription.profiles.avatar_url}
                        alt={subscription.profiles.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold">{subscription.profiles?.full_name}</h3>
                    <p className="text-sm text-muted-foreground">@{subscription.profiles?.username}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                        {subscription.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(subscription.price_cents / 100)}/month
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = `/creator/${subscription.profiles?.username}`}
                    >
                      View Profile
                    </Button>
                    {subscription.status === 'active' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCancelSubscription(subscription.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export const MyPlaylists = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', is_public: false });

  useEffect(() => {
    fetchPlaylists();
  }, [user]);

  const fetchPlaylists = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setPlaylists(data || []);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your playlists',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!user || !formData.name) return;

    try {
      const { error } = await supabase
        .from('playlists')
        .insert({
          name: formData.name,
          description: formData.description,
          is_public: formData.is_public,
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: 'Playlist Created',
        description: 'Your playlist has been created successfully',
      });

      setFormData({ name: '', description: '', is_public: false });
      setShowCreateForm(false);
      fetchPlaylists();
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to create playlist',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;

      toast({
        title: 'Playlist Deleted',
        description: 'Your playlist has been deleted successfully',
      });

      fetchPlaylists();
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete playlist',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading your playlists...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Playlists</h2>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Playlist
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Playlist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Playlist name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
            <Textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_public"
                checked={formData.is_public}
                onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
              />
              <label htmlFor="is_public" className="text-sm">Make playlist public</label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreatePlaylist} disabled={!formData.name}>
                Create
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {playlists.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No playlists yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first playlist to organize your favorite tracks!
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Playlist
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <Card key={playlist.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{playlist.name}</CardTitle>
                    <CardDescription>{playlist.description}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditingPlaylist(playlist)}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeletePlaylist(playlist.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant={playlist.is_public ? 'default' : 'secondary'}>
                    {playlist.is_public ? 'Public' : 'Private'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(playlist.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
