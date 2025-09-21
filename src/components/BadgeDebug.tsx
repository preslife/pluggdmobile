import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBadges } from '@/hooks/useBadges';
import { useGamification } from '@/hooks/useGamification';
import { Button } from '@/components/ui/button';

export const BadgeDebug = () => {
  const { userBadges, allBadges, getBadgeProgress, isUnlocked, forceRefresh } = useBadges();
  const { userStats } = useGamification();

  useEffect(() => {
    console.log('Badge Debug - User Stats:', userStats);
    console.log('Badge Debug - User Badges:', userBadges);
    console.log('Badge Debug - All Badges:', allBadges);
  }, [userStats, userBadges, allBadges]);

  const checkBadgeLogic = () => {
    allBadges.forEach(badge => {
      const progress = getBadgeProgress(badge, userStats);
      const unlocked = isUnlocked(badge.badge_type);
      console.log(`Badge: ${badge.name}`, {
        required_action: badge.required_action,
        required_count: badge.required_count,
        required_points: badge.required_points,
        current_value: userStats?.[badge.required_action as keyof typeof userStats] || 0,
        progress: progress,
        should_unlock: progress >= 100,
        is_unlocked: unlocked
      });
    });
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Badge System Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={checkBadgeLogic}>
          Check Badge Logic
        </Button>
        <Button onClick={forceRefresh}>
          Force Refresh
        </Button>
        <div className="text-sm space-y-2">
          <div>User Stats: {JSON.stringify(userStats, null, 2)}</div>
          <div>Badges Count: {userBadges.length} unlocked, {allBadges.length} total</div>
        </div>
      </CardContent>
    </Card>
  );
};