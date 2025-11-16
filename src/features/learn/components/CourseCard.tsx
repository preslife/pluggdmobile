import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Users } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type { LmsCourse } from '../api/types';

interface CourseCardProps {
  course: LmsCourse;
  onSelect?: (course: LmsCourse) => void;
}

export const CourseCard = ({ course, onSelect }: CourseCardProps) => {
  const handleClick = onSelect ? () => onSelect(course) : undefined;
  const lessonsLabel = course.lesson_count === 1 ? 'lesson' : 'lessons';
  const durationHours = Math.round((course.duration_minutes ?? 0) / 60);
  const priceCents = course.pricing?.one_time_price_cents ?? course.price_cents;
  const priceCurrency = course.pricing?.currency?.toUpperCase() ?? course.currency?.toUpperCase() ?? 'USD';
  const priceLabel =
    priceCents && priceCents > 0 ? formatCurrency(priceCents / 100, priceCurrency) : 'Included with membership';

  return (
    <Card className={cn('flex h-full cursor-pointer flex-col overflow-hidden border-muted bg-background/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg', !onSelect && 'cursor-default')} onClick={handleClick}>
      <div className="relative h-44 bg-muted">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent text-primary">
            <BookOpen className="h-10 w-10" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-background/80 capitalize text-foreground">
            {course.difficulty}
          </Badge>
          {course.visibility !== 'public' && (
            <Badge variant="outline" className="border-white/60 bg-background/80 text-xs text-foreground">
              {course.visibility}
            </Badge>
          )}
        </div>
      </div>

      <CardHeader className="space-y-3">
        <CardTitle className="line-clamp-2 text-lg font-semibold">{course.title}</CardTitle>
        {course.subtitle && <p className="line-clamp-2 text-sm text-muted-foreground">{course.subtitle}</p>}
        {course.instructor && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {course.instructor.avatar_url && <img src={course.instructor.avatar_url} alt={course.instructor.name ?? 'Instructor'} className="h-6 w-6 rounded-full object-cover" />}
            <span>{course.instructor.name ?? course.instructor.username ?? 'Instructor'}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="inline-flex flex-wrap gap-2">
          {course.topics.slice(0, 3).map((topic) => (
            <Badge key={topic} variant="secondary" className="bg-muted text-xs text-muted-foreground">
              {topic}
            </Badge>
          ))}
        </div>
        <dl className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <div>
              <dt className="uppercase tracking-wide">Duration</dt>
              <dd className="text-sm text-foreground">{durationHours || '<1'} hrs</dd>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <div>
              <dt className="uppercase tracking-wide">Lessons</dt>
              <dd className="text-sm text-foreground">
                {course.lesson_count} {lessonsLabel}
              </dd>
            </div>
          </div>
        </dl>
      </CardContent>

      <CardFooter className="mt-auto flex items-center justify-between border-t pt-4">
        <div className="text-sm font-semibold text-foreground">{priceLabel}</div>
        <Button size="sm" onClick={handleClick} disabled={!onSelect}>
          View details
        </Button>
      </CardFooter>
    </Card>
  );
};
