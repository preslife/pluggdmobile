import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Share2, 
  Copy, 
  Facebook, 
  Twitter, 
  Linkedin, 
  MessageCircle,
  Code,
  Link,
  Send
} from 'lucide-react';
import { useShare } from '@/hooks/useShare';
import { formatCurrency } from '@/lib/utils';

type Beat = {
  id: string;
  title: string;
  description?: string;
  genre: string;
  bpm?: number;
  key?: string;
  price: number;
  image_url?: string;
  profiles?: {
    username?: string;
    full_name?: string;
  } | null;
};

interface ShareModalProps {
  beat: Beat;
  children?: React.ReactNode;
}

const ShareModal = ({ beat, children }: ShareModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [embedWidth, setEmbedWidth] = useState(400);
  const [embedHeight, setEmbedHeight] = useState(200);
  const { shareToSocial, copyToClipboard, nativeShare, generateShareableLink, generateEmbedCode } = useShare();

  const artistName = beat.profiles?.full_name || beat.profiles?.username || 'Unknown Artist';
  const shareUrl = generateShareableLink(beat.id);
  const shareText = `Check out "${beat.title}" by ${artistName} - ${beat.genre} beat at ${beat.bpm} BPM for ${formatCurrency(beat.price)}`;
  
  const shareData = {
    title: `${beat.title} by ${artistName}`,
    text: shareText,
    url: shareUrl,
    image: beat.image_url
  };

  const socialPlatforms = [
    { name: 'Twitter', icon: Twitter, platform: 'twitter', color: 'bg-blue-500' },
    { name: 'Facebook', icon: Facebook, platform: 'facebook', color: 'bg-blue-600' },
    { name: 'LinkedIn', icon: Linkedin, platform: 'linkedin', color: 'bg-blue-700' },
    { name: 'Reddit', icon: MessageCircle, platform: 'reddit', color: 'bg-orange-500' },
    { name: 'WhatsApp', icon: Send, platform: 'whatsapp', color: 'bg-green-500' },
    { name: 'Telegram', icon: Send, platform: 'telegram', color: 'bg-blue-400' }
  ];

  const handleSocialShare = (platform: string) => {
    shareToSocial(platform, shareData);
  };

  const handleCopyLink = () => {
    copyToClipboard(shareUrl);
  };

  const handleNativeShare = () => {
    nativeShare(shareData);
  };

  const handleCopyEmbed = () => {
    const embedCode = generateEmbedCode(beat.id, embedWidth, embedHeight);
    copyToClipboard(embedCode);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm">
            <Share2 className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Beat
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="social" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="embed">Embed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="social" className="space-y-4">
            <div className="space-y-3">
              <div className="text-center p-4 bg-muted rounded-lg">
                <h4 className="font-semibold">{beat.title}</h4>
                <p className="text-sm text-muted-foreground">by {artistName}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge variant="outline">{beat.genre}</Badge>
                  {beat.bpm && <Badge variant="outline">{beat.bpm} BPM</Badge>}
                  <Badge variant="outline">{formatCurrency(beat.price)}</Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {socialPlatforms.map((platform) => {
                  const IconComponent = platform.icon;
                  return (
                    <Button
                      key={platform.platform}
                      variant="outline"
                      onClick={() => handleSocialShare(platform.platform)}
                      className="justify-start gap-2"
                    >
                      <IconComponent className="w-4 h-4" />
                      {platform.name}
                    </Button>
                  );
                })}
              </div>
              
              <Button 
                onClick={handleNativeShare} 
                className="w-full"
                variant="default"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share via Device
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="link" className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="share-url">Share URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="share-url"
                    value={shareUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button onClick={handleCopyLink} size="sm">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="share-text">Share Text</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="share-text"
                    value={shareText}
                    readOnly
                    className="flex-1"
                  />
                  <Button onClick={() => copyToClipboard(shareText)} size="sm">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="embed" className="space-y-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="embed-width">Width</Label>
                  <Input
                    id="embed-width"
                    type="number"
                    value={embedWidth}
                    onChange={(e) => setEmbedWidth(Number(e.target.value))}
                    min="200"
                    max="800"
                  />
                </div>
                <div>
                  <Label htmlFor="embed-height">Height</Label>
                  <Input
                    id="embed-height"
                    type="number"
                    value={embedHeight}
                    onChange={(e) => setEmbedHeight(Number(e.target.value))}
                    min="150"
                    max="600"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="embed-code">Embed Code</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="embed-code"
                    value={generateEmbedCode(beat.id, embedWidth, embedHeight)}
                    readOnly
                    className="flex-1 font-mono text-xs"
                  />
                  <Button onClick={handleCopyEmbed} size="sm">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded border text-sm text-muted-foreground">
                <Code className="w-4 h-4 inline mr-1" />
                Copy this code to embed the beat player on your website
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;