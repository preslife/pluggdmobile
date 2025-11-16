import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { LmsCourse } from '../api/types';
import { CourseCard } from './CourseCard';

interface CourseGridProps {
  courses: LmsCourse[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  onSelectCourse?: (course: LmsCourse) => void;
}

export const CourseGrid = ({ courses, isLoading, isFetchingNextPage, hasNextPage, onLoadMore, onSelectCourse }: CourseGridProps) => {
  if (isLoading && courses.length === 0) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <LoadingGrid />
      </div>
    );
  }

  if (!isLoading && courses.length === 0) {
    return (
      <div className="rounded-3xl border bg-muted/30 p-10 text-center">
        <p className="text-lg font-semibold text-foreground">No courses match these filters yet.</p>
        <p className="mt-2 text-sm text-muted-foreground">Try adjusting search keywords or difficulty to see everything currently published.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} onSelect={onSelectCourse} />
        ))}
        {isLoading && <LoadingGrid />}
      </div>

      {hasNextPage && (
        <div className="flex justify-center">
          <Button onClick={onLoadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
};

const LoadingGrid = () => (
  <>
    {[...Array(6)].map((_, index) => (
      <div key={index} className="rounded-3xl border bg-card/60 p-4">
        <Skeleton className="mb-4 h-40 w-full rounded-2xl" />
        <Skeleton className="mb-2 h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="mt-6 flex gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    ))}
  </>
);
