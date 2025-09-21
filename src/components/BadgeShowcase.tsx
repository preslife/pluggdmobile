import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useBadges } from '@/hooks/useBadges';
import { useGamification } from '@/hooks/useGamification';
import { Trophy, Lock, Star, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const BadgeShowcase = () => {
  const { userBadges, allBadges, loading, getBadgeProgress, isUnlocked, getTierColor, getTierIcon, forceRefresh } = useBadges();
  const { userStats } = useGamification();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Badges & Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Badges & Achievements
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={forceRefresh}
            disabled={loading}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </CardTitle>
        <CardDescription>
          {userBadges.length} of {allBadges.length} badges unlocked
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allBadges.map((badge) => {
            const unlocked = isUnlocked(badge.badge_type);
            const progress = getBadgeProgress(badge, userStats);
            const tierColor = getTierColor(badge.tier);
            const tierIcon = getTierIcon(badge.tier);

            return (
              <div
                key={badge.id}
                className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                  unlocked 
                    ? `${tierColor} bg-gradient-to-br from-background to-accent/10 shadow-lg` 
                    : 'border-muted bg-muted/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`text-2xl ${unlocked ? '' : 'grayscale opacity-50'}`}>
                    {unlocked ? tierIcon : <Lock className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium ${unlocked ? '' : 'text-muted-foreground'}`}>
                      {badge.name}
                    </h4>
                    <p className={`text-sm ${unlocked ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
                      {badge.description}
                    </p>
                    
                    {unlocked ? (
                      <Badge variant="secondary" className="mt-2">
                        <Star className="w-3 h-3 mr-1" />
                        Unlocked
                      </Badge>
                    ) : (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Progress</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                        <div className="text-xs text-muted-foreground">
                          {badge.required_count > 0 
                            ? `${badge.required_count} ${badge.required_action.replace('_', ' ')}`
                            : `${badge.required_points} XP`
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};