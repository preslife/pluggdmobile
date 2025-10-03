import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2 } from 'lucide-react';

interface SecureDownloadButtonProps {
  releaseId: string;
  title: string;
  disabled?: boolean;
  className?: string;
}

export const SecureDownloadButton = ({ 
  releaseId, 
  title,
  disabled = false,
  className = ''
}: SecureDownloadButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to download releases',
        variant: 'destructive',
      });
      return;
    }

    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('download-signed-url', {
        body: { releaseId }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.downloadUrl) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = `${title}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: 'Download Started',
          description: 'Your secure download has begun',
        });
      }
    } catch (error: any) {
      console.error('Download error:', error);
      const description = error?.message?.includes('Access denied')
        ? 'This download is locked. Complete your purchase or verify your membership.'
        : (error?.message || 'Unable to download. Please try again.');

      toast({
        title: 'Download Failed',
        description,
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button 
      onClick={handleDownload}
      disabled={disabled || downloading}
      className={className}
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
