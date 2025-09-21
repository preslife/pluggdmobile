import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Radio, Plus } from 'lucide-react';

interface LiveTabProps {
  profile: any;
  stats: any;
  visitorStatus: any;
  count?: number;
}

export const LiveTab = ({ visitorStatus }: LiveTabProps) => (
  <div className="text-center py-12">
    <Radio className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
    <h3 className="text-xl font-semibold mb-2">No Live Sessions</h3>
    <p className="text-muted-foreground mb-4">
      {visitorStatus?.isOwner 
        ? "Schedule your first live session"
        : "This creator hasn't scheduled any live sessions yet"
      }
    </p>
    {visitorStatus?.isOwner && (
      <Button>
        <Plus className="w-4 h-4 mr-2" />
        Schedule Session
      </Button>
    )}
  </div>
);

export default LiveTab;