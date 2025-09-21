import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SamplePackDownloaderProps {
  samplePackId: string;
  title: string;
  className?: string;
}

export const SamplePackDownloader = ({ 
  samplePackId, 
  title, 
  className = "" 
}: SamplePackDownloaderProps) => {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      setDownloading(true);

      const { data, error } = await supabase.functions.invoke('download-sample-pack', {
        body: { samplePackId }
      });

      if (error) throw error;

      if (data?.downloadUrl) {
        // Create download link
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Download started",
          description: `${title} is downloading. ${data.downloadsRemaining || 0} downloads remaining.`
        });
      }
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Download failed", 
        description: error.message || "Failed to download sample pack",
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button 
      onClick={handleDownload}
      disabled={downloading}
      className={className}
      size="sm"
    >
      <Download className="w-4 h-4 mr-2" />
      {downloading ? 'Downloading...' : 'Download'}
    </Button>
  );
};