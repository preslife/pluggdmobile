
import React, { useEffect, useMemo, useState } from "react";
import { CommissionRequest, CommissionStatus, useCommissionRequests } from "@/hooks/useCommissionRequests";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle } from "lucide-react";
import { CommissionChat } from "@/components/CommissionChat";
import { CommissionBidding } from "@/components/CommissionBidding";
import { MobileCommissionChat } from "@/components/MobileCommissionChat";
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  role: "requester" | "producer";
  emptyMessage?: string;
};

const statusLabels: Record<CommissionStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  funded: "Funded",
  in_progress: "In progress",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const CommissionRequestsList: React.FC<Props> = ({ role, emptyMessage }) => {
  const { toast } = useToast();
  const { listAsProducer, listAsRequester, updateStatus } = useCommissionRequests();
  const [items, setItems] = useState<CommissionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const load = async () => {
    setLoading(true);
    const res = role === "producer" ? await listAsProducer() : await listAsRequester();
    if ("error" in res) {
      toast({
        title: "Error loading requests",
        description: res.error.message || "Please try again.",
        variant: "destructive",
      });
      setItems([]);
    } else {
      setItems(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const nextActions = useMemo(() => {
    // Minimal action mapping. You can expand as needed.
    return {
      pending: role === "producer" ? ["accepted", "cancelled"] : [],
      accepted: role === "requester" ? ["funded", "cancelled"] : [],
      funded: role === "producer" ? ["in_progress", "cancelled"] : [],
      in_progress: role === "producer" ? ["delivered", "cancelled"] : [],
      delivered: role === "requester" ? ["completed", "refunded"] : [],
      completed: [],
      cancelled: [],
      refunded: [],
    } as Record<CommissionStatus, CommissionStatus[]>;
  }, [role]);

  const handleTransition = async (id: string, status: CommissionStatus) => {
    if (status === "funded") {
      const { data, error } = await supabase.functions.invoke("create-commission-funding", {
        body: { commissionId: id },
      });
      if (error || !data?.url) {
        toast({
          title: "Checkout failed",
          description: error?.message || "Please try again.",
          variant: "destructive",
        });
        return;
      }
      window.open(data.url, "_blank");
      toast({ title: "Redirecting to Stripe", description: "Complete payment to fund this commission." });
      return;
    }

    const res = await updateStatus(id, status);
    if ("error" in res) {
      toast({
        title: "Update failed",
        description: res.error.message || "Please try again.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Status updated", description: `Moved to ${statusLabels[status]}.` });
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  return (
    <div className="space-y-4">
      {loading && <div className="text-muted-foreground text-sm">Loading commission requests...</div>}
      {!loading && items.length === 0 && (
        <div className="text-muted-foreground text-sm">
          {emptyMessage || "No commission requests yet."}
        </div>
      )}

      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{item.title}</CardTitle>
            <CardDescription className="text-xs">
              {item.genre ? `${item.genre} • ` : ""}
              Budget: {(item.budget_cents / 100).toFixed(2)}
              {item.deadline ? ` • Deadline: ${item.deadline}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {item.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description}</p>
            )}

            <div className="flex items-center justify-between">
              <div className="text-xs">
                Status: <span className="font-medium">{statusLabels[item.status]}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setSelectedChatId(selectedChatId === item.id ? null : item.id)}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Chat
                </Button>
                {nextActions[item.status].map((s) => (
                  <Button key={s} size="sm" variant="secondary" onClick={() => handleTransition(item.id, s)}>
                    {statusLabels[s]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Commission Bidding */}
            {item.status === 'pending' && (
              <div className="mt-4">
                <CommissionBidding 
                  commissionRequest={item} 
                  userRole={role}
                />
              </div>
            )}

            {/* Chat Component */}
            {selectedChatId === item.id && (
              <div className="mt-4">
                {isMobile ? (
                  <MobileCommissionChat 
                    commissionId={item.id} 
                    recipientName="Commissioner" 
                    status={item.status} 
                  />
                ) : (
                  <CommissionChat commissionId={item.id} />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CommissionRequestsList;
