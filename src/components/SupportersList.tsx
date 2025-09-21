import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type Supporter = {
  id: string;
  fan_id: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
};

type Props = {
  className?: string;
};

export const SupportersList: React.FC<Props> = ({ className }) => {
  const { user } = useAuth();
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchSupporters = async () => {
      const { data, error } = await supabase
        .from('fan_subscriptions')
        .select(`
          id,
          fan_id,
          status,
          created_at
        `)
        .eq('creator_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching supporters:', error);
        setLoading(false);
        return;
      }

      // Fetch profile data separately
      const fanIds = data?.map(s => s.fan_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, username, avatar_url')
        .in('user_id', fanIds);

      const supportersWithProfiles = data?.map(supporter => ({
        ...supporter,
        profiles: profiles?.find(p => p.user_id === supporter.fan_id) || null
      })) || [];

      setSupporters(supportersWithProfiles);
      setLoading(false);
    };

    fetchSupporters();

    // Set up realtime subscription
    const channel = supabase
      .channel('supporters_list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fan_subscriptions',
          filter: `creator_id=eq.${user.id}`,
        },
        () => {
          fetchSupporters();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>My Supporters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading supporters...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>My Supporters ({supporters.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {supporters.length === 0 ? (
          <div className="text-muted-foreground text-center py-4">
            No supporters yet. Share your profile to get your first supporters!
          </div>
        ) : (
          <div className="space-y-3">
            {supporters.map((supporter) => (
              <div key={supporter.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={supporter.profiles?.avatar_url} />
                  <AvatarFallback>
                    {supporter.profiles?.full_name?.[0] ||
                     supporter.profiles?.username?.[0] ||
                     'S'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">
                    {supporter.profiles?.full_name ||
                     supporter.profiles?.username ||
                     'Anonymous Supporter'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Supporting since {new Date(supporter.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};