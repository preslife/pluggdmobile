import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, MessageCircle } from 'lucide-react';

interface CollabOpenCardProps {
  creatorId: string;
}

export const CollabOpenCard = ({ creatorId }: CollabOpenCardProps) => (
  <Card className="border-primary/20 bg-primary/5">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        Open for Collabs
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground mb-4">
        Interested in collaborating? Let's create something amazing together!
      </p>
      <Button className="w-full">
        <MessageCircle className="w-4 h-4 mr-2" />
        Send Collaboration Request
      </Button>
    </CardContent>
  </Card>
);

export default CollabOpenCard;