import { useQuery } from '@tanstack/react-query';
import { fetchLmsCourseDetail } from '../api/client';

export const useLmsCourseDetail = (slug?: string) =>
  useQuery({
    queryKey: ['lms-course-detail', slug],
    queryFn: () => {
      if (!slug) throw new Error('Missing course slug');
      return fetchLmsCourseDetail(slug, true);
    },
    enabled: Boolean(slug),
    staleTime: 60_000,
  });
