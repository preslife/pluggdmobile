import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, X, RefreshCw } from "lucide-react";

interface HealthResult {
  ok: boolean;
  result: Record<string, any>;
  error?: string;
}

const Row = ({ label, ok }: { label: string; ok: boolean }) => (
  <div className="flex items-center justify-between py-2 border-b last:border-b-0">
    <span>{label}</span>
    {ok ? (
      <Badge className="flex items-center gap-1"><Check className="w-4 h-4" />OK</Badge>
    ) : (
      <Badge variant="secondary" className="flex items-center gap-1"><X className="w-4 h-4" />Missing</Badge>
    )}
  </div>
);

export const IntegrationsHealthCheck = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HealthResult["result"] | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("integrations-health");
      if (error) throw error;
      setData(data.result);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Integrations Health</CardTitle>
          <CardDescription>Checks presence of required Supabase secrets</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />{loading ? "Checking…" : "Re-run"}
        </Button>
      </CardHeader>
      <CardContent>
        {loading && <div className="text-sm text-muted-foreground">Running checks…</div>}
        {!loading && data && (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Supabase</h3>
              <Row label="SUPABASE_URL" ok={!!data.supabase?.url} />
              <Row label="SUPABASE_ANON_KEY" ok={!!data.supabase?.anonKey} />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Stripe</h3>
              <Row label="STRIPE_SECRET_KEY" ok={!!data.stripe?.secretKey} />
              <Row label="STRIPE_WEBHOOK_SECRET" ok={!!data.stripe?.webhookSecret} />
            </div>
            <div>
              <h3 className="font-semibold mb-2">OpenAI</h3>
              <Row label="OPENAI_API_KEY" ok={!!data.openai?.apiKey} />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Spotify</h3>
              <Row label="SPOTIFY_CLIENT_ID" ok={!!data.spotify?.clientId} />
              <Row label="SPOTIFY_CLIENT_SECRET" ok={!!data.spotify?.clientSecret} />
            </div>
            <div>
              <h3 className="font-semibold mb-2">YouTube</h3>
              <Row label="YOUTUBE_API_KEY" ok={!!data.youtube?.apiKey} />
            </div>
            <div>
              <h3 className="font-semibold mb-2">ElevenLabs</h3>
              <Row label="ELEVENLABS_API_KEY" ok={!!data.elevenlabs?.apiKey} />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Hume</h3>
              <Row label="HUME_API_KEY" ok={!!data.hume?.apiKey} />
              <Row label="HUME_SECRET_KEY" ok={!!data.hume?.secretKey} />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Resend</h3>
              <Row label="RESEND_API_KEY" ok={!!data.resend?.apiKey} />
            </div>
            <div>
              <h3 className="font-semibold mb-2">PayPal</h3>
              <Row label="PAYPAL_CLIENT_ID" ok={!!data.paypal?.clientId} />
              <Row label="PAYPAL_CLIENT_SECRET" ok={!!data.paypal?.clientSecret} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IntegrationsHealthCheck;
