import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Copy, Loader2 } from "lucide-react";

interface PressKitGeneratorProps {
  entityType: 'creator' | 'release';
  entityId: string;
  entityName: string;
  currentPressKitUrl?: string;
  onGenerated?: (url: string) => void;
}

export const PressKitGenerator = ({ 
  entityType, 
  entityId, 
  entityName, 
  currentPressKitUrl,
  onGenerated 
}: PressKitGeneratorProps) => {
  const [loading, setLoading] = useState(false);
  const [pressKitUrl, setPressKitUrl] = useState(currentPressKitUrl);
  const { toast } = useToast();

  const generatePressKit = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('generate-press-kit', {
        body: {
          entity_type: entityType,
          entity_id: entityId
        }
      });

      if (error) throw error;

      const newUrl = data.press_kit_url;
      setPressKitUrl(newUrl);
      onGenerated?.(newUrl);

      toast({
        title: "Press kit generated",
        description: `${entityType === 'creator' ? 'Creator' : 'Release'} press kit has been created successfully`,
      });
    } catch (error) {
      console.error('Error generating press kit:', error);
      toast({
        title: "Error",
        description: "Failed to generate press kit. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyPressKitLink = async () => {
    if (!pressKitUrl) return;
    
    try {
      await navigator.clipboard.writeText(pressKitUrl);
      toast({
        title: "Link copied",
        description: "Press kit link has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard",
        variant: "destructive"
      });
    }
  };

  const downloadPressKit = () => {
    if (!pressKitUrl) return;
    window.open(pressKitUrl, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Press Kit Generator
        </CardTitle>
        <CardDescription>
          Generate a professional press kit for {entityName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {entityType === 'creator' ? (
            <p>Your press kit will include your biography, recent releases, social links, and key statistics.</p>
          ) : (
            <p>Your press kit will include release artwork, credits, streaming links, and artist information.</p>
          )}
        </div>

        {pressKitUrl ? (
          <div className="space-y-3">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium">
                Press kit is ready!
              </p>
              <p className="text-xs text-green-600 mt-1">
                Last generated: {new Date().toLocaleDateString()}
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={downloadPressKit} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={copyPressKitLink} variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              No press kit generated yet
            </p>
          </div>
        )}

        <Button 
          onClick={generatePressKit} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Press Kit...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              {pressKitUrl ? 'Regenerate Press Kit' : 'Generate Press Kit'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};