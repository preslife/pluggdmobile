import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';

interface CoursesBlockProps {
  creatorId: string;
}

export const CoursesBlock = ({ creatorId }: CoursesBlockProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <BookOpen className="w-5 h-5" />
        Courses
      </CardTitle>
    </CardHeader>
    <CardContent className="text-center py-6">
      <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
      <p className="text-sm text-muted-foreground mb-3">
        No courses available yet
      </p>
      <Button variant="outline" size="sm">
        Browse All
      </Button>
    </CardContent>
  </Card>
);

export default CoursesBlock;