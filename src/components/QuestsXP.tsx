import React from 'react';
import { useQuests } from '@/hooks/useQuests';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

export function QuestsXP() {
  const { user } = useAuth();
  const { quests, loading, completing, completeQuest, todayXP } = useQuests();

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <CardTitle>Today's Quests</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Sign in to view daily quests</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <CardTitle>Today's Quests</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <CardTitle>Today's Quests</CardTitle>
          </div>
          <Badge className="border-amber-400/30 bg-amber-500/10 text-amber-200">
            {todayXP} XP
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {quests.map((quest) => (
            <label 
              key={quest.id} 
              className={`flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 cursor-pointer transition-colors ${
                quest.completed ? 'opacity-60' : 'hover:bg-white/10'
              }`}
            >
              <Checkbox
                checked={quest.completed}
                disabled={quest.completed || completing === quest.id}
                onCheckedChange={() => {
                  if (!quest.completed && completing !== quest.id) {
                    completeQuest(quest.id);
                  }
                }}
                className="accent-amber-500"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${quest.completed ? 'line-through' : ''}`}>
                    {quest.title}
                  </span>
                  <div className="flex items-center gap-2">
                    {completing === quest.id && (
                      <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                    )}
                    <span className="text-xs text-amber-400">+{quest.xp} XP</span>
                  </div>
                </div>
              </div>
            </label>
          ))}
          {quests.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-4">
              No quests available today
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}