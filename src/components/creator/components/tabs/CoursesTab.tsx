import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus } from 'lucide-react';

interface CoursesTabProps {
  profile: any;
  stats: any;
  visitorStatus: any;
  count?: number;
}

export const CoursesTab = ({ visitorStatus }: CoursesTabProps) => (
  <div className="text-center py-12">
    <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
    <h3 className="text-xl font-semibold mb-2">No Courses Yet</h3>
    <p className="text-muted-foreground mb-4">
      {visitorStatus?.isOwner 
        ? "Create your first course to share your knowledge"
        : "This creator hasn't published any courses yet"
      }
    </p>
    {visitorStatus?.isOwner && (
      <Button>
        <Plus className="w-4 h-4 mr-2" />
        Create Course
      </Button>
    )}
  </div>
);

export default CoursesTab;