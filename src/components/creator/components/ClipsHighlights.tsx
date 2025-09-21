import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Film } from 'lucide-react';

interface ClipsHighlightsProps {
  creatorId: string;
}

export const ClipsHighlights = ({ creatorId }: ClipsHighlightsProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Film className="w-5 h-5" />
        Video Highlights
      </CardTitle>
    </CardHeader>
    <CardContent className="text-center py-6">
      <Film className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
      <p className="text-sm text-muted-foreground mb-3">
        No video highlights yet
      </p>
      <Button variant="outline" size="sm">
        <Play className="w-4 h-4 mr-2" />
        View All Videos
      </Button>
    </CardContent>
  </Card>
);

export default ClipsHighlights;