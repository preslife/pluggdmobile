import { useToast } from '@/hooks/use-toast';

type ShareData = {
  title: string;
  text: string;
  url: string;
  image?: string;
};

export const useShare = () => {
  const { toast } = useToast();

  const shareToSocial = (platform: string, data: ShareData) => {
    const encodedUrl = encodeURIComponent(data.url);
    const encodedTitle = encodeURIComponent(data.title);
    const encodedText = encodeURIComponent(data.text);
    
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'reddit':
        shareUrl = `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank', 'width=550,height=420');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Link copied!",
        description: "Beat link has been copied to your clipboard",
      });
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        toast({
          title: "Link copied!",
          description: "Beat link has been copied to your clipboard",
        });
      } catch (fallbackError) {
        toast({
          title: "Failed to copy",
          description: "Please copy the link manually",
          variant: "destructive"
        });
      }
      document.body.removeChild(textArea);
    }
  };

  const nativeShare = async (data: ShareData) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.title,
          text: data.text,
          url: data.url
        });
      } catch (error) {
        // User cancelled sharing or error occurred
        console.log('Sharing cancelled or failed:', error);
      }
    } else {
      // Fallback to copy to clipboard
      copyToClipboard(data.url);
    }
  };

  const generateShareableLink = (beatId: string) => {
    return `${window.location.origin}/beat/${beatId}`;
  };

  const generateEmbedCode = (beatId: string, width = 400, height = 200) => {
    const embedUrl = `${window.location.origin}/embed/beat/${beatId}`;
    return `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" allow="autoplay"></iframe>`;
  };

  return {
    shareToSocial,
    copyToClipboard,
    nativeShare,
    generateShareableLink,
    generateEmbedCode
  };
};