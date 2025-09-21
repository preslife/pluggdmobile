import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, Twitter, Instagram, MessageCircle, Copy, Gift, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCreditsWithGBP } from "@/hooks/useWallet";

interface ShareToEarnModalProps {
  children: React.ReactNode;
  shareUrl: string;
  shareTitle: string;
  shareDescription: string;
}

export const ShareToEarnModal = ({ children, shareUrl, shareTitle, shareDescription }: ShareToEarnModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);

  // Generate unique share token for tracking
  const generateShareToken = () => {
    return `${user?.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const trackShareClick = async (platform: string, shareToken: string) => {
    if (!user) return;

    try {
      await supabase.functions.invoke('track-share-signup', {
        body: {
          action: 'click',
          share_token: shareToken,
          sharer_user_id: user.id,
          share_platform: platform
        }
      });
    } catch (error) {
      console.error('Error tracking share click:', error);
    }
  };

  const handleShare = async (platform: 'twitter' | 'instagram' | 'discord' | 'direct') => {
    if (!user) return;
    
    setIsSharing(true);
    const shareToken = generateShareToken();
    const trackedUrl = `${shareUrl}?share=${shareToken}`;
    
    try {
      let shareText = "";
      let fullUrl = "";

      switch (platform) {
        case 'twitter':
          shareText = `🎵 Check out ${shareTitle} on 9X Music Hub! ${shareDescription}`;
          fullUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(trackedUrl)}`;
          break;
        
        case 'instagram':
          // Instagram doesn't support direct sharing with URLs, so we copy the link
          await navigator.clipboard.writeText(`${shareText}\n\n${trackedUrl}`);
          toast({
            title: "Link Copied!",
            description: "Share this on Instagram to earn 200 credits (£2.00) when someone signs up!"
          });
          break;
        
        case 'discord':
          shareText = `🎵 **${shareTitle}**\n${shareDescription}\n${trackedUrl}`;
          await navigator.clipboard.writeText(shareText);
          toast({
            title: "Message Copied!",
            description: "Paste this in Discord to earn credits when friends sign up!"
          });
          break;
        
        case 'direct':
          await navigator.clipboard.writeText(trackedUrl);
          toast({
            title: "Link Copied!",
            description: "Share this link to earn 200 credits (£2.00) when someone signs up!"
          });
          break;
      }

      // Track the share click
      await trackShareClick(platform, shareToken);

      if (platform === 'twitter') {
        window.open(fullUrl, '_blank', 'width=600,height=400');
      }

      toast({
        title: "Share Tracked!",
        description: `You'll earn ${formatCreditsWithGBP(200)} if someone signs up within 7 days!`
      });

    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: "Share Failed",
        description: "There was an error tracking your share. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSharing(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Share & Earn Credits
          </DialogTitle>
          <DialogDescription>
            Share this content and earn {formatCreditsWithGBP(200)} when someone signs up within 7 days!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Earning Potential */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Earning Potential</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {formatCreditsWithGBP(200)} per signup
                </Badge>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Credits are awarded when someone signs up within 7 days of clicking your link
              </p>
            </CardContent>
          </Card>

          {/* Share Options */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => handleShare('twitter')}
              disabled={isSharing}
            >
              <Twitter className="h-5 w-5 text-blue-500" />
              <span className="text-xs">Twitter/X</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => handleShare('instagram')}
              disabled={isSharing}
            >
              <Instagram className="h-5 w-5 text-pink-500" />
              <span className="text-xs">Instagram</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => handleShare('discord')}
              disabled={isSharing}
            >
              <MessageCircle className="h-5 w-5 text-indigo-500" />
              <span className="text-xs">Discord</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => handleShare('direct')}
              disabled={isSharing}
            >
              <Copy className="h-5 w-5 text-gray-600" />
              <span className="text-xs">Copy Link</span>
            </Button>
          </div>

          {/* How it Works */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">How Share-to-Earn works:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Click a platform to share with your unique tracking link</li>
              <li>When someone clicks and signs up within 7 days, you earn credits</li>
              <li>Credits are added to your wallet automatically</li>
              <li>No limit on how much you can earn!</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};