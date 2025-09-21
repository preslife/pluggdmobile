import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import {
  TrendingUp,
  Users,
  Play,
  Calendar,
  Star,
  Heart,
  Music,
  Headphones,
  Clock,
  Radio,
  Sparkles,
  Timer,
  Bell
} from 'lucide-react';

interface CreatorProfile {
  username: string;
  full_name: string;
  created_at: string;
}

interface CreatorStats {
  total_followers: number;
  total_plays: number;
  supporter_count: number;
  next_live_date?: string;
}

interface SocialProofBarProps {
  stats: CreatorStats | null;
  profile: CreatorProfile;
}

interface LiveProof {
  recent_supporters: number;
  drops_this_month: number;
  next_live_countdown?: string;
}

export const SocialProofBar = ({ stats, profile }: SocialProofBarProps) => {
  const [liveProof, setLiveProof] = useState<LiveProof | null>(null);
  const [nextLiveCountdown, setNextLiveCountdown] = useState<string | null>(null);

  useEffect(() => {
    fetchLiveProofData();
    if (stats?.next_live_date) {
      startCountdown();
    }
  }, [stats?.next_live_date]);

  const fetchLiveProofData = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch recent supporters count
      const { count: recentSupporters } = await supabase
        .from('fan_subscriptions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('status', 'active');

      // Fetch drops this month (releases + beats)
      const [
        { count: releases },
        { count: beats }
      ] = await Promise.all([
        supabase.from('releases').select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString())
          .eq('status', 'published'),
        supabase.from('beats').select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString())
          .eq('is_published', true)
      ]);

      setLiveProof({
        recent_supporters: recentSupporters || 0,
        drops_this_month: (releases || 0) + (beats || 0)
      });

    } catch (error) {
      console.error('Error fetching live proof data:', error);
    }
  };

  const startCountdown = () => {
    if (!stats?.next_live_date) return;

    const updateCountdown = () => {
      const now = new Date();
      const liveDate = new Date(stats.next_live_date!);
      const timeDiff = liveDate.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setNextLiveCountdown('LIVE NOW!');
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setNextLiveCountdown(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setNextLiveCountdown(`${hours}h ${minutes}m`);
      } else {
        setNextLiveCountdown(`${minutes}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  };

  if (!stats) return null;

  const proofItems = [
    {
      icon: Users,
      value: stats.total_followers.toLocaleString(),
      label: 'Followers',
      trend: '+12%',
      show: stats.total_followers > 0
    },
    {
      icon: Play,
      value: stats.total_plays.toLocaleString(),
      label: 'Total Plays',
      trend: 'All time',
      show: stats.total_plays > 0
    },
    {
      icon: Heart,
      value: stats.supporter_count.toString(),
      label: 'Supporters',
      trend: liveProof && liveProof.recent_supporters > 0 ? `+${liveProof.recent_supporters} this month` : undefined,
      show: stats.supporter_count > 0
    },
    {
      icon: Music,
      value: liveProof?.drops_this_month.toString() || '0',
      label: 'New Drops',
      trend: 'This month',
      show: (liveProof?.drops_this_month || 0) > 0
    },
    {
      icon: Radio,
      value: nextLiveCountdown || 'TBA',
      label: 'Next Live',
      trend: nextLiveCountdown === 'LIVE NOW!' ? '🔴 Live' : undefined,
      show: !!stats.next_live_date,
      isLive: nextLiveCountdown === 'LIVE NOW!'
    }
  ];

  const visibleItems = proofItems.filter(item => item.show);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-muted/30 border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-center md:justify-between flex-wrap gap-4">
          
          {/* Social Proof Items */}
          <div className="flex items-center gap-6 flex-wrap justify-center md:justify-start">
            {visibleItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <IconComponent className={`w-4 h-4 ${
                    item.isLive ? 'text-red-500 animate-pulse' : 'text-muted-foreground'
                  }`} />
                  <div className="flex items-center gap-1">
                    <span className={`font-medium ${item.isLive ? 'text-red-500' : ''}`}>
                      {item.value}
                    </span>
                    <span className="text-muted-foreground">
                      {item.label}
                    </span>
                    {item.trend && (
                      <Badge 
                        variant={item.isLive ? 'destructive' : 'secondary'} 
                        className="text-xs ml-1"
                      >
                        {item.trend}
                      </Badge>
                    )}
                  </div>
                  
                  {index < visibleItems.length - 1 && (
                    <Separator orientation="vertical" className="h-4 mx-2 hidden sm:block" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Call-to-Action Nudges */}
          <div className="flex items-center gap-4">
            {/* Active Creator Badge */}
            {liveProof && liveProof.drops_this_month > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Active Creator
              </Badge>
            )}

            {/* Live Session Notification */}
            {stats.next_live_date && nextLiveCountdown && nextLiveCountdown !== 'LIVE NOW!' && (
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Bell className="w-3 h-3" />
                <span className="hidden sm:inline">Notify Me</span>
                <Timer className="w-3 h-3" />
                {nextLiveCountdown}
              </Button>
            )}

            {/* Join Live Now */}
            {nextLiveCountdown === 'LIVE NOW!' && (
              <Button size="sm" className="bg-red-500 hover:bg-red-600 animate-pulse">
                <Radio className="w-3 h-3 mr-2" />
                Join Live Now
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialProofBar;