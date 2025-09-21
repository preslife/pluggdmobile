import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Quote } from 'lucide-react';

interface TestimonialsBlockProps {
  creatorId: string;
}

export const TestimonialsBlock = ({ creatorId }: TestimonialsBlockProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Star className="w-5 h-5" />
        Fan Reviews
      </CardTitle>
    </CardHeader>
    <CardContent className="text-center py-6">
      <Quote className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
      <p className="text-sm text-muted-foreground mb-3">
        No reviews yet
      </p>
      <Button variant="outline" size="sm">
        View All Reviews
      </Button>
    </CardContent>
  </Card>
);

export default TestimonialsBlock;