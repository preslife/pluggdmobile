import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Package, Music, Image, FileText, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DistributionExporterProps {
  releaseId: string;
  releaseTitle: string;
  platforms?: {
    spotify?: boolean;
    apple_music?: boolean;
    youtube_music?: boolean;
  };
}

export const DistributionExporter = ({ 
  releaseId, 
  releaseTitle, 
  platforms = {} 
}: DistributionExporterProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to export distribution package",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('export-release-distribution', {
        body: { releaseId }
      });

      if (error) throw error;

      // Create downloadable JSON file
      const exportData = JSON.stringify(data, null, 2);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `${releaseTitle}_distribution_package.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Distribution package has been downloaded to your device"
      });

    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: error.message || "Failed to create distribution package",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedPlatforms = Object.entries(platforms)
    .filter(([_, enabled]) => enabled)
    .map(([platform, _]) => platform);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Distribution Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Export your release as a complete package ready for distribution to streaming platforms.
        </div>

        {/* Selected Platforms */}
        {selectedPlatforms.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Selected Platforms:</h4>
            <div className="flex flex-wrap gap-2">
              {selectedPlatforms.map((platform) => (
                <Badge key={platform} variant="secondary" className="capitalize">
                  {platform.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Package Contents */}
        <div>
          <h4 className="font-medium mb-2">Package Contains:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-primary" />
              Audio Files
            </div>
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4 text-primary" />
              Cover Artwork
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Metadata JSON
            </div>
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-primary" />
              Platform URLs
            </div>
          </div>
        </div>

        <Button 
          onClick={handleExport}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Package className="w-4 h-4 mr-2 animate-spin" />
              Creating Package...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export Distribution Package
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground">
          The package includes signed URLs valid for 1 hour. Download and use immediately.
        </div>
      </CardContent>
    </Card>
  );
};