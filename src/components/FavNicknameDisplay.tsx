import { useFavNicknames } from "@/hooks/useFavNicknames";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface FavNicknameDisplayProps {
  userId: string;
  variant?: 'profile' | 'comment' | 'compact' | 'inline';
  showIcon?: boolean;
  showPrimary?: boolean;
  showAll?: boolean;
  className?: string;
}

export const FavNicknameDisplay = ({ 
  userId, 
  variant = 'profile',
  showIcon = true,
  showPrimary = true,
  showAll = false,
  className 
}: FavNicknameDisplayProps) => {
  const { nicknames, loading, hasNicknames } = useFavNicknames(userId);

  if (loading || !hasNicknames) {
    return null;
  }

  const primaryNickname = nicknames.find(n => n.display_order === 0);
  const secondaryNicknames = nicknames.filter(n => n.display_order > 0);

  // Render different variants
  switch (variant) {
    case 'profile':
      return (
        <div className={cn("space-y-3", className)}>
          {showIcon && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4" />
              <span>FAV Nicknames</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {primaryNickname && (
              <Badge variant="default" className="text-sm py-1">
                {primaryNickname.custom_icon} {primaryNickname.nickname}
                <span className="ml-1 text-xs opacity-75">(Primary)</span>
              </Badge>
            )}
            {(showAll || !showPrimary) && secondaryNicknames.map((nickname, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-sm py-1"
              >
                {nickname.custom_icon} {nickname.nickname}
              </Badge>
            ))}
          </div>
        </div>
      );

    case 'comment':
      if (!primaryNickname) return null;
      return (
        <Badge 
          variant="outline" 
          className={cn("text-xs", className)}
        >
          {primaryNickname.custom_icon} {primaryNickname.nickname}
        </Badge>
      );

    case 'compact':
      if (!primaryNickname) return null;
      return (
        <span className={cn("text-sm text-primary font-medium", className)}>
          {primaryNickname.custom_icon} {primaryNickname.nickname}
        </span>
      );

    case 'inline':
      if (!primaryNickname) return null;
      return (
        <span className={cn("inline-flex items-center gap-1", className)}>
          <span>{primaryNickname.custom_icon}</span>
          <span className="font-medium">{primaryNickname.nickname}</span>
        </span>
      );

    default:
      return null;
  }
};

export default FavNicknameDisplay;