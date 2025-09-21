import { Link, useLocation } from "react-router-dom";
import { Home, Music, Users, User, MessageCircle, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDomain } from "@/hooks/useDomain";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface MobileBottomTabBarProps {
  className?: string;
}

export const MobileBottomTabBar = ({ className }: MobileBottomTabBarProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const { isLiveDomain, isLiveRoute } = useDomain();
  const isMobile = useIsMobile();

  // Don't render on desktop
  if (!isMobile) return null;

  // Compute mode based on domain and route
  const mode = (isLiveDomain || isLiveRoute) ? 'live' : 'hub';

  // HUB tabs - simplified and context-aware
  const hubTabs = user ? [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Music, label: 'Music', href: '/marketplace' },
    { icon: MessageCircle, label: 'Community', href: '/community' },
    { icon: Wallet, label: 'Wallet', href: '/dashboard/wallet' },
    { icon: User, label: 'Profile', href: '/dashboard' },
  ] : [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Music, label: 'Music', href: '/marketplace' },
    { icon: MessageCircle, label: 'Community', href: '/community' },
    { icon: User, label: 'Sign In', href: '/auth' },
  ];

  // LIVE tabs - simplified with better icons
  const liveTabs = [
    { icon: Home, label: 'Live', href: '/live' },
    { icon: Users, label: 'Sessions', href: '/live/sessions' },
    { icon: Music, label: 'Events', href: '/live/events' },
    { icon: Home, label: 'Hub', href: '/' },
  ];

  const tabs = mode === 'live' ? liveTabs : hubTabs;

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-40",
      className
    )}>
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-0",
                isActive ? "text-primary bg-primary/10" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};