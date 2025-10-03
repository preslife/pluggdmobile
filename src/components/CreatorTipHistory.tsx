import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatCredits } from "@/hooks/useWallet";

interface Tip {
  id: string;
  amount: number;
  message: string | null;
  created_at: string;
  fan_id: string;
  status?: string | null;
}

export const CreatorTipHistory = () => {
  const { user } = useAuth();
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTips, setTotalTips] = useState(0);

  useEffect(() => {
    if (user) {
      loadTips();
    }
  }, [user]);

  const loadTips = async () => {
    try {
      const { data, error } = await supabase
        .from('artist_tips')
        .select('id, amount, message, created_at, fan_id, status')
        .eq('artist_id', user!.id)
        .or('status.eq.succeeded,status.is.null')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setTips(data || []);

      // Calculate total tips
      const total = (data || []).reduce((sum, tip) => sum + tip.amount, 0);
      setTotalTips(total);
    } catch (error) {
      console.error('Error loading tips:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading tips...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Tip History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {formatCredits(totalTips)} credits received
            </Badge>
            <Badge variant="outline">
              {tips.length} tips
            </Badge>
          </div>

          {tips.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Heart className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No tips received yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tips.map((tip) => (
                <div
                  key={tip.id}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <Heart className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        Anonymous Fan
                      </span>
                      <Badge variant="secondary">
                        {formatCredits(tip.amount)} credits
                      </Badge>
                    </div>
                    {tip.message && (
                      <div className="flex items-start gap-2 mt-2">
                        <MessageCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">{tip.message}</p>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                      {new Date(tip.created_at).toLocaleDateString()} at{' '}
                      {new Date(tip.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
