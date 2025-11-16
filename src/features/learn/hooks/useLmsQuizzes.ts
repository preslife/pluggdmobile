import { useQuery } from '@tanstack/react-query';
import { fetchLmsQuizzes } from '../api/client';

export const useLmsQuizzes = (courseId?: string, enabled = true) => {
  return useQuery({
    queryKey: ['lms-quizzes', courseId],
    queryFn: () => {
      if (!courseId) throw new Error('Missing course id');
      return fetchLmsQuizzes(courseId);
    },
    enabled: Boolean(courseId) && enabled,
    staleTime: 60_000,
  });
};
