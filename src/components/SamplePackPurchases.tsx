import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Music, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SamplePackDownloader } from './SamplePackDownloader';

interface Purchase {
  id: string;
  sample_pack_id: string;
  amount_paid: number;
  purchased_at: string;
  downloads_used?: number;
  download_limit?: number;
  download_expires_at: string | null;
  sample_pack: {
    title: string;
    cover_art_url: string | null;
    genre: string;
    sample_count: number;
  };
}

export const SamplePackPurchases = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPurchases();
    }
  }, [user]);

  const fetchPurchases = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sample_pack_purchases')
        .select(`
          *,
          sample_pack:sample_packs(
            title,
            cover_art_url,
            genre,
            sample_count
          )
        `)
        .eq('user_id', user.id)
        .order('purchased_at', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No purchases yet</h3>
        <p className="text-muted-foreground">
          Browse the sample pack store to find your first pack
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">My Sample Pack Purchases</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {purchases.map((purchase) => (
          <Card key={purchase.id} className="overflow-hidden">
            <div className="aspect-square relative">
              {purchase.sample_pack?.cover_art_url ? (
                <img
                  src={purchase.sample_pack.cover_art_url}
                  alt={purchase.sample_pack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Music className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>

            <CardContent className="p-4">
              <div className="space-y-2">
                <div>
                  <h3 className="font-medium leading-tight">{purchase.sample_pack?.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {purchase.sample_pack?.genre} • {purchase.sample_pack?.sample_count} samples
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(purchase.purchased_at).toLocaleDateString()}
                  </div>
                  <span>£{(purchase.amount_paid / 100).toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant="outline">
                    {purchase.downloads_used || 0}/{purchase.download_limit || 3} downloads
                  </Badge>
                  
                  {(purchase.downloads_used || 0) < (purchase.download_limit || 3) && (
                    <SamplePackDownloader
                      samplePackId={purchase.sample_pack_id}
                      title={purchase.sample_pack?.title || 'Sample Pack'}
                    />
                  )}
                </div>

                {purchase.download_expires_at && (
                  <p className="text-xs text-muted-foreground">
                    Expires: {new Date(purchase.download_expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};