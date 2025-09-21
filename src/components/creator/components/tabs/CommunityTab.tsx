import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus } from 'lucide-react';

interface CommunityTabProps {
  profile: any;
  stats: any;
  visitorStatus: any;
  count?: number;
}

export const CommunityTab = ({ visitorStatus }: CommunityTabProps) => (
  <div className="text-center py-12">
    <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
    <h3 className="text-xl font-semibold mb-2">Community Coming Soon</h3>
    <p className="text-muted-foreground mb-4">
      {visitorStatus?.isOwner 
        ? "Build your community with exclusive posts and discussions"
        : "This creator's community features are coming soon"
      }
    </p>
    {visitorStatus?.isOwner && (
      <Button>
        <Plus className="w-4 h-4 mr-2" />
        Start Community
      </Button>
    )}
  </div>
);

export default CommunityTab;