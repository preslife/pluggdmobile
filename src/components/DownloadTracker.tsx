import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface DownloadEvent {
  id: string;
  purchase_id: string;
  purchase_type: 'beat' | 'release' | 'sample_pack';
  file_path: string;
  created_at: string;
}

interface PurchaseWithDownloads {
  id: string;
  title: string;
  type: 'beat' | 'release' | 'sample_pack';
  downloadUrl?: string;
  downloadCount: number;
  maxDownloads: number;
  canDownload: boolean;
}

export const DownloadTracker = () => {
  const [purchases, setPurchases] = useState<PurchaseWithDownloads[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchPurchasesWithDownloads();
    }
  }, [user]);

  const fetchPurchasesWithDownloads = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get all download events for the user
      const { data: downloadEvents } = await supabase
        .from('download_events')
        .select('*')
        .eq('user_id', user.id);

      // Get user's purchases from different sources
      const [beatPurchases, releasePurchases, samplePackPurchases] = await Promise.all([
        supabase
          .from('purchases')
          .select(`
            id,
            beat_id,
            beats!inner(title, audio_url)
          `)
          .eq('buyer_id', user.id),
        supabase
          .from('release_purchases')
          .select(`
            id,
            release_id,
            releases!inner(title, download_url)
          `)
          .eq('user_id', user.id),
        supabase
          .from('sample_pack_purchases')
          .select(`
            id,
            sample_pack_id,
            sample_packs!inner(title, download_url)
          `)
          .eq('user_id', user.id)
      ]);

      const allPurchases: PurchaseWithDownloads[] = [];

      // Process beat purchases
      if (beatPurchases.data) {
        beatPurchases.data.forEach(purchase => {
          const downloadCount = downloadEvents?.filter(
            event => event.purchase_id === purchase.id && event.purchase_type === 'beat'
          ).length || 0;

          allPurchases.push({
            id: purchase.id,
            title: purchase.beats.title,
            type: 'beat',
            downloadUrl: purchase.beats.audio_url,
            downloadCount,
            maxDownloads: 5, // Default limit
            canDownload: downloadCount < 5
          });
        });
      }

      // Process release purchases
      if (releasePurchases.data) {
        releasePurchases.data.forEach(purchase => {
          const downloadCount = downloadEvents?.filter(
            event => event.purchase_id === purchase.id && event.purchase_type === 'release'
          ).length || 0;

          allPurchases.push({
            id: purchase.id,
            title: purchase.releases.title,
            type: 'release',
            downloadUrl: purchase.releases.download_url,
            downloadCount,
            maxDownloads: 3, // Stricter limit for releases
            canDownload: downloadCount < 3
          });
        });
      }

      // Process sample pack purchases
      if (samplePackPurchases.data) {
        samplePackPurchases.data.forEach(purchase => {
          const downloadCount = downloadEvents?.filter(
            event => event.purchase_id === purchase.id && event.purchase_type === 'sample_pack'
          ).length || 0;

          allPurchases.push({
            id: purchase.id,
            title: purchase.sample_packs.title,
            type: 'sample_pack',
            downloadUrl: purchase.sample_packs.download_url,
            downloadCount,
            maxDownloads: 3, // Standard limit
            canDownload: downloadCount < 3
          });
        });
      }

      setPurchases(allPurchases);
    } catch (error) {
      console.error('Error fetching purchases with downloads:', error);
      toast({
        title: "Error",
        description: "Failed to load your purchases.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (purchase: PurchaseWithDownloads) => {
    if (!purchase.canDownload || !purchase.downloadUrl) {
      toast({
        title: "Download limit reached",
        description: "Please contact support if you need additional downloads.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get signed URL for download
      const { data, error } = await supabase.functions.invoke('download-signed-url', {
        body: { 
          releaseId: purchase.id,
          purchaseType: purchase.type
        }
      });

      if (error) throw error;

      // Open download in new tab
      window.open(data.signedUrl, '_blank');

      // Log download event
      await supabase
        .from('download_events')
        .insert({
          user_id: user?.id,
          purchase_id: purchase.id,
          purchase_type: purchase.type,
          file_path: purchase.downloadUrl
        });

      // Refresh the list
      fetchPurchasesWithDownloads();

      toast({
        title: "Download started",
        description: "Your download should begin shortly.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  const requestMoreDownloads = async (purchaseId: string) => {
    // This could send an email to support or create a ticket
    toast({
      title: "Request submitted",
      description: "We'll review your request for additional downloads.",
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CardHeader className="px-0">
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          My Downloads
        </CardTitle>
      </CardHeader>

      {purchases.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No purchases found.</p>
          </CardContent>
        </Card>
      ) : (
        purchases.map((purchase) => (
          <Card key={purchase.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{purchase.title}</h3>
                    <Badge variant="outline" className="capitalize">
                      {purchase.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      Downloads: {purchase.downloadCount} / {purchase.maxDownloads}
                    </span>
                    {!purchase.canDownload && (
                      <div className="flex items-center gap-1 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        Limit reached
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {purchase.canDownload ? (
                    <Button
                      size="sm"
                      onClick={() => handleDownload(purchase)}
                      disabled={!purchase.downloadUrl}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => requestMoreDownloads(purchase.id)}
                    >
                      Request More
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};