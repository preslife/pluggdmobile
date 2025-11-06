import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2 } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useLogger } from '@/hooks/useLogger';
import { cn } from '@/lib/utils';

type PurchaseType = "release" | "beat" | "sample_pack";

interface SecureDownloadButtonProps {
  purchaseId: string;
  purchaseType: PurchaseType;
  releaseId?: string;
  title: string;
  disabled?: boolean;
  className?: string;
}

export const SecureDownloadButton = ({
  purchaseId,
  purchaseType,
  releaseId,
  title,
  disabled = false,
  className = ''
}: SecureDownloadButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const analytics = useAnalytics({ enableGDPRCompliance: true, consentRequired: false });
  const { logEvent, logError, logApiCall, logUserAction } = useLogger({
    component: 'SecureDownloadButton',
    feature: 'downloads',
    metadata: {
      purchase_id: purchaseId,
      purchase_type: purchaseType,
      release_id: releaseId,
      title,
    },
  });

  const handleDownload = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to download releases',
        variant: 'destructive',
      });
      void logEvent('secure_download_blocked_unauthenticated', {
        purchaseId,
        purchaseType,
        releaseId,
      });
      return;
    }

    void logUserAction('secure_download_clicked', {
      purchaseId,
      purchaseType,
      releaseId,
    });

    setDownloading(true);
    const start = performance.now();
    let status = 200;
    let errorForLog: unknown = null;

    try {
      const { data, error } = await supabase.functions.invoke('download-signed-url', {
        body: { purchaseId, purchaseType }
      });

      if (error) {
        status = 500;
        throw error;
      }

      if (data?.error) {
        status = 422;
        throw new Error(data.error);
      }

      const signedUrl: string | undefined = data?.signedUrl ?? data?.downloadUrl;

      if (signedUrl) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = signedUrl;
        link.download = `${title}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: 'Download Started',
          description: 'Your secure download has begun',
        });

        await analytics.track('release_download', {
          release_id: releaseId,
          title,
          status: 'success',
          source: 'release_detail_secure_button',
          purchase_id: purchaseId,
          purchase_type: purchaseType,
        });
        void logEvent('secure_download_started', {
          purchaseId,
          purchaseType,
          releaseId,
        });
      }
    } catch (error: any) {
      console.error('Download error:', error);
      errorForLog = error;
      const description = error?.message?.includes('Access denied')
        ? 'This download is locked. Complete your purchase or verify your membership.'
        : (error?.message || 'Unable to download. Please try again.');

      toast({
        title: 'Download Failed',
        description,
        variant: 'destructive',
      });

      void logError('secure_download_failed', error, {
        purchaseId,
        purchaseType,
        releaseId,
      });
      if (status < 400) {
        status = 500;
      }
    } finally {
      const duration = performance.now() - start;
      void logApiCall('function', 'download-signed-url', duration, status, {
        purchaseId,
        purchaseType,
        releaseId,
        error: errorForLog instanceof Error ? errorForLog.message : undefined,
      });
      setDownloading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={disabled || downloading}
      className={cn("min-h-[44px] gap-2", className)}
      variant="outline"
    >
      {downloading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      {downloading ? 'Downloading...' : 'Download'}
    </Button>
  );
};
