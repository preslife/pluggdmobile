import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Star, TrendingUp, Sparkles } from "lucide-react";

interface ToolPreviewProps {
  toolId: string | number;
  name: string;
  previewUrl?: string;
  previewType?: 'gif' | 'video' | 'image';
  isNew?: boolean;
  isPopular?: boolean;
  isFeatured?: boolean;
  popularity?: number;
  className?: string;
}

export const ToolPreview: React.FC<ToolPreviewProps> = ({
  toolId,
  name,
  previewUrl,
  previewType = 'image',
  isNew = false,
  isPopular = false,
  isFeatured = false,
  popularity = 0,
  className = ""
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handlePreviewToggle = () => {
    if (previewType === 'video') {
      setIsPlaying(!isPlaying);
    }
  };

  const getBadges = () => {
    const badges = [];
    
    if (isFeatured) {
      badges.push(
        <Badge key="featured" className="bg-gradient-primary text-primary-foreground">
          <Sparkles className="w-3 h-3 mr-1" />
          Featured
        </Badge>
      );
    }
    
    if (isNew) {
      badges.push(
        <Badge key="new" className="bg-green-100 text-green-800 border-green-200">
          New
        </Badge>
      );
    }
    
    if (isPopular || popularity > 50) {
      badges.push(
        <Badge key="popular" className="bg-orange-100 text-orange-800 border-orange-200">
          <TrendingUp className="w-3 h-3 mr-1" />
          Popular
        </Badge>
      );
    }

    return badges;
  };

  const getDefaultPreview = () => {
    // Return different default previews based on tool type
    const toolName = name.toLowerCase();
    
    if (toolName.includes('beat') || toolName.includes('music')) {
      return (
        <div className="w-full h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
              🎵
            </div>
            <p className="text-sm text-white/80">Music Tool Preview</p>
          </div>
        </div>
      );
    }
    
    if (toolName.includes('lyric') || toolName.includes('write')) {
      return (
        <div className="w-full h-32 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
              ✍️
            </div>
            <p className="text-sm text-white/80">Writing Tool Preview</p>
          </div>
        </div>
      );
    }
    
    if (toolName.includes('analytic') || toolName.includes('chart')) {
      return (
        <div className="w-full h-32 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
              📊
            </div>
            <p className="text-sm text-white/80">Analytics Preview</p>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-32 bg-gradient-to-br from-gray-500/20 to-slate-500/20 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
            🛠️
          </div>
          <p className="text-sm text-white/80">Tool Preview</p>
        </div>
      </div>
    );
  };

  return (
    <div className={`relative group ${className}`}>
      {/* Badges */}
      {getBadges().length > 0 && (
        <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1">
          {getBadges()}
        </div>
      )}

      {/* Preview Content */}
      <div className="relative overflow-hidden rounded-lg">
        {previewUrl ? (
          <>
            {previewType === 'video' ? (
              <div className="relative">
                <video
                  className="w-full h-32 object-cover"
                  src={previewUrl}
                  muted
                  loop
                  playsInline
                  onLoadedData={() => setIsLoaded(true)}
                  ref={(video) => {
                    if (video) {
                      if (isPlaying) {
                        video.play();
                      } else {
                        video.pause();
                      }
                    }
                  }}
                />
                {isLoaded && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handlePreviewToggle}
                  >
                    {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </Button>
                )}
              </div>
            ) : (
              <img
                src={previewUrl}
                alt={`${name} preview`}
                className="w-full h-32 object-cover"
                onLoad={() => setIsLoaded(true)}
              />
            )}
          </>
        ) : (
          getDefaultPreview()
        )}

        {/* Overlay for interaction hint */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="secondary" size="sm">
              <Play className="w-3 h-3 mr-1" />
              Preview
            </Button>
          </div>
        </div>
      </div>

      {/* Popularity indicator */}
      {popularity > 0 && (
        <div className="absolute bottom-2 right-2">
          <div className="flex items-center gap-1 bg-black/50 text-white text-xs px-2 py-1 rounded">
            <Star className="w-3 h-3 fill-current" />
            {popularity}%
          </div>
        </div>
      )}
    </div>
  );
};