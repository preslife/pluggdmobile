import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Users, Check, X, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Invite {
  id: string;
  type: 'collaboration' | 'band' | 'project' | 'event';
  title: string;
  from: string;
  fromAvatar?: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'declined';
}

/**
 * InvitesWidget - Implements spec requirement for "invites section"
 * Shows pending collaboration invites and allows quick actions
 */
export const InvitesWidget: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchInvites();
    }
  }, [user?.id]);

  const fetchInvites = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch collaboration invites
      const { data: collabInvites, error } = await supabase
        .from('collab_applicants')
        .select(`
          id,
          status,
          created_at,
          collaborations (
            id,
            title,
            creator_id,
            profiles!collaborations_creator_id_fkey (
              username,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Transform data to invite format
      const formattedInvites: Invite[] = collabInvites?.map(invite => ({
        id: invite.id,
        type: 'collaboration',
        title: invite.collaborations?.title || 'Untitled Project',
        from: invite.collaborations?.profiles?.username || 'Unknown',
        fromAvatar: invite.collaborations?.profiles?.avatar_url,
        createdAt: invite.created_at,
        status: 'pending'
      })) || [];

      // Add mock invites for demonstration
      if (formattedInvites.length === 0) {
        formattedInvites.push(
          {
            id: '1',
            type: 'collaboration',
            title: 'Summer Beat Tape',
            from: 'BeatMaker Pro',
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            status: 'pending'
          },
          {
            id: '2',
            type: 'project',
            title: 'Hip-Hop Album Production',
            from: 'Studio Records',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending'
          }
        );
      }

      setInvites(formattedInvites);
      
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (inviteId: string, action: 'accept' | 'decline') => {
    try {
      // Update invite status
      const { error } = await supabase
        .from('collab_applicants')
        .update({ 
          status: action === 'accept' ? 'accepted' : 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', inviteId);

      if (error) throw error;

      // Remove from local state
      setInvites(prev => prev.filter(inv => inv.id !== inviteId));

      toast({
        title: action === 'accept' ? 'Invite accepted!' : 'Invite declined',
        description: action === 'accept' 
          ? 'You can now collaborate on this project' 
          : 'The invite has been declined',
      });

    } catch (error) {
      console.error(`Error ${action}ing invite:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action} invite`,
        variant: 'destructive'
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'collaboration':
        return <Users className="h-3 w-3" />;
      case 'band':
        return <Users className="h-3 w-3" />;
      case 'project':
        return <UserPlus className="h-3 w-3" />;
      default:
        return <UserPlus className="h-3 w-3" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'collaboration':
        return 'bg-blue-500/10 text-blue-500';
      case 'band':
        return 'bg-purple-500/10 text-purple-500';
      case 'project':
        return 'bg-green-500/10 text-green-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Invites</CardTitle>
        <UserPlus className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : invites.length > 0 ? (
          <div className="space-y-2">
            {invites.map((invite) => (
              <div key={invite.id} className="p-2 border rounded-lg">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className={`text-xs ${getTypeColor(invite.type)}`}>
                        {getTypeIcon(invite.type)}
                        <span className="ml-1">{invite.type}</span>
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(invite.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate">{invite.title}</p>
                    <p className="text-xs text-muted-foreground">from {invite.from}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handleInvite(invite.id, 'accept')}
                    >
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handleInvite(invite.id, 'decline')}
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {invites.length >= 5 && (
              <Button variant="ghost" size="sm" className="w-full text-xs">
                View all invites
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Users className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              No pending invites
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InvitesWidget;
