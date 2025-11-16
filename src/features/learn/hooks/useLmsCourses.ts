import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchLmsCourses } from '../api/client';
import type { LmsCourseFilters } from '../api/types';

export const LMS_PAGE_SIZE = 12;

export const useLmsCourses = (filters: LmsCourseFilters) => {
  return useInfiniteQuery({
    queryKey: ['lms-courses', filters],
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) =>
      fetchLmsCourses({
        ...filters,
        limit: LMS_PAGE_SIZE,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === LMS_PAGE_SIZE ? allPages.length * LMS_PAGE_SIZE : undefined,
  });
};
