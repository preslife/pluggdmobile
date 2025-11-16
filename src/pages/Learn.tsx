import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LearnHero } from '@/features/learn/components/LearnHero';
import { CourseFilters, CourseFilterState } from '@/features/learn/components/CourseFilters';
import { CourseGrid } from '@/features/learn/components/CourseGrid';
import { useLmsCourses } from '@/features/learn/hooks/useLmsCourses';
import type { LmsCourseFilters } from '@/features/learn/api/types';
import { usePageMetadata } from '@/hooks/usePageMetadata';

const DEFAULT_FILTERS: CourseFilterState = {
  query: '',
  difficulty: 'all',
  visibility: 'all',
  topic: null,
};

const LearnPage = () => {
  const navigate = useNavigate();
  usePageMetadata({
    title: 'Pluggd Academy',
    description: 'Native LMS with live Supabase data—courses, lessons, and assessments powered by Pluggd.',
    path: '/learn',
  });

  const [filters, setFilters] = useState<CourseFilterState>(DEFAULT_FILTERS);

  const queryFilters = useMemo<LmsCourseFilters>(
    () => ({
      query: filters.query.trim() || undefined,
      difficulty: filters.difficulty === 'all' ? null : filters.difficulty,
      visibility: filters.visibility === 'all' ? null : filters.visibility,
    }),
    [filters]
  );

  const coursesQuery = useLmsCourses(queryFilters);

  const aggregatedCourses = useMemo(
    () => coursesQuery.data?.pages.flat() ?? [],
    [coursesQuery.data]
  );

  const filteredCourses = useMemo(() => {
    if (!filters.topic) return aggregatedCourses;
    return aggregatedCourses.filter((course) => course.topics.includes(filters.topic!));
  }, [aggregatedCourses, filters.topic]);

  const topics = useMemo(() => {
    const set = new Set<string>();
    aggregatedCourses.forEach((course) => {
      course.topics.forEach((topic) => set.add(topic));
    });
    return Array.from(set).sort();
  }, [aggregatedCourses]);

  return (
    <div className="space-y-10 px-4 py-10 md:px-8">
      <LearnHero />

      <section className="space-y-6" id="catalog">
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Phase F rollout</p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Course catalog</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Every tile below comes from the new `lms_courses` tables, filtered in Postgres via the adapter RPCs we just shipped. Search, pagination, and difficulty filters run on live data—no mock JSON.
            </p>
          </div>
        </div>

        <CourseFilters filters={filters} topics={topics} onChange={setFilters} />

        <CourseGrid
          courses={filteredCourses}
          isLoading={coursesQuery.isLoading}
          isFetchingNextPage={coursesQuery.isFetchingNextPage}
          hasNextPage={coursesQuery.hasNextPage}
          onLoadMore={() => coursesQuery.fetchNextPage()}
          onSelectCourse={(course) => navigate(`/learn/${course.slug}`)}
        />
      </section>
    </div>
  );
};

export default LearnPage;
