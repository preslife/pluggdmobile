import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { formatCurrency } from '@/lib/utils';
import { LiveGiftEventItem, UseLiveGiftsState } from '@/hooks/useLiveGifts';
import { formatDistanceToNow } from 'date-fns';
import { Gift, Sparkles } from 'lucide-react';

interface LiveGiftPanelProps extends UseLiveGiftsState {
  roomId: string;
  hostId?: string;
}

const MAX_MESSAGE_LENGTH = 120;

export const LiveGiftPanel: React.FC<LiveGiftPanelProps> = ({
  catalog,
  events,
  loading,
  sending,
  sendGift,
  roomId,
  hostId,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { balance, refreshBalance } = useWallet();

  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!selectedGiftId && catalog.length > 0) {
      setSelectedGiftId(catalog[0].id);
    }
  }, [catalog, selectedGiftId]);

  const selectedGift = useMemo(
    () => catalog.find((item) => item.id === selectedGiftId) || null,
    [catalog, selectedGiftId]
  );

  const totalCost = useMemo(() => {
    if (!selectedGift) return 0;
    return selectedGift.credit_cost * Math.max(1, quantity);
  }, [selectedGift, quantity]);

  const canAfford = balance?.available_credits >= totalCost;

  const handleQuantityChange = (value: number) => {
    if (Number.isNaN(value) || value <= 0) {
      setQuantity(1);
    } else {
      setQuantity(Math.min(99, Math.floor(value)));
    }
  };

  const handleSendGift = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Create a Pluggd account or sign in to send live gifts.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedGift) {
      toast({
        title: 'Select a gift',
        description: 'Choose a gift from the catalog before sending.',
      });
      return;
    }

    if (!canAfford) {
      toast({
        title: 'Top up credits',
        description: 'You do not have enough credits. Add credits to continue.',
        variant: 'destructive',
      });
      return;
    }

    const trimmed = message.trim();

    const result = await sendGift(selectedGift.id, {
      quantity,
      message: trimmed ? trimmed.slice(0, MAX_MESSAGE_LENGTH) : undefined,
    });

    if (result.success) {
      toast({
        title: 'Gift sent!',
        description: `Thanks for supporting the stream with the ${selectedGift.label}!`,
      });
      await refreshBalance();
      setMessage('');
      setQuantity(1);
    }
  };

  const renderEvent = (event: LiveGiftEventItem) => {
    const displayName = event.sender_id === user?.id ? 'You' : event.sender_id.slice(0, 8);
    const giftLabel = event.gift?.label || 'Gift';
    return (
      <div key={event.id} className="rounded-lg border border-border px-3 py-2 bg-background/60">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            <span className="font-medium">{displayName}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
          </span>
        </div>
        <div className="mt-1 text-sm">
          <span className="font-semibold">{giftLabel}</span>
          <span className="text-muted-foreground"> × {event.quantity}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {event.total_credits} credits
          </span>
        </div>
        {event.message && (
          <p className="mt-1 text-xs italic text-muted-foreground">“{event.message}”</p>
        )}
      </div>
    );
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-4 w-4 text-primary" />
          Live Gifts
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Support the host in real time. Gifts convert directly into creator credits.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="text-sm font-semibold">Wallet balance</div>
          <div className="text-2xl font-bold">
            {balance?.available_credits?.toLocaleString() ?? 0} credits
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCurrency((balance?.available_credits ?? 0) / 100)} approximate value
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Gift catalog</h3>
            <Badge variant="outline">{catalog.length} options</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {catalog.map((gift) => {
              const isSelected = gift.id === selectedGiftId;
              return (
                <button
                  key={gift.id}
                  onClick={() => setSelectedGiftId(gift.id)}
                  className={`group rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                    isSelected ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-background'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{gift.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {gift.credit_cost} credits
                      </div>
                    </div>
                    {gift.thumbnail_url ? (
                      <img
                        src={gift.thumbnail_url}
                        alt={gift.label}
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <Gift className="h-8 w-8 text-primary/70" />
                    )}
                  </div>
                  {gift.description && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {gift.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {!catalog.length && !loading && (
            <p className="text-sm text-muted-foreground">
              No live gifts configured yet. Add gifts from the creator studio to enable this feature.
            </p>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-1/2">
              <label className="text-xs font-medium text-muted-foreground">Quantity</label>
              <Input
                type="number"
                min={1}
                max={99}
                value={quantity}
                onChange={(event) => handleQuantityChange(Number(event.target.value))}
                className="mt-1"
              />
            </div>
            <div className="w-1/2 rounded-lg border border-border bg-muted/20 p-3 text-sm">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-base font-semibold">{totalCost} credits</div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Message (optional)
              <span className="text-[10px] text-muted-foreground">
                {message.length}/{MAX_MESSAGE_LENGTH}
              </span>
            </label>
            <Input
              value={message}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Add a short shoutout"
              className="mt-1"
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSendGift}
            disabled={sending || loading || !catalog.length || !selectedGift || !canAfford}
          >
            {sending ? 'Sending…' : selectedGift ? `Send ${selectedGift.label}` : 'Select a gift'}
          </Button>

          {!canAfford && selectedGift && (
            <p className="text-xs text-destructive">
              You need {totalCost - (balance?.available_credits ?? 0)} more credits to send this gift.
            </p>
          )}
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Recent gifts</h3>
            <Badge variant="outline">{events.length}</Badge>
          </div>
          <ScrollArea className="max-h-64 pr-3">
            <div className="space-y-2">
              {events.slice(0, 15).map(renderEvent)}
              {!events.length && (
                <p className="text-xs text-muted-foreground">
                  Gifts will appear here in real time once the stream kicks off.
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
