import { supabase } from '../../lib/supabase';
import { createAcademyApi, type AcademyRpc } from './academyApi';
import { createAcademyActorScope, type AcademyBoundQuery } from './academySession';

// Generated native database types predate these already-live website contracts.
const db = supabase as any;
const actorScope = createAcademyActorScope({
  session: () => supabase.auth.getSession(),
  subscribe: listener => {
    const { data } = supabase.auth.onAuthStateChange(event => listener(event));
    return () => data.subscription.unsubscribe();
  },
  rpc: (name, args) => db.rpc(name, args) as AcademyBoundQuery,
  updateResume: (actor, courseId, lessonId, visitedAt) => db.from('lms_course_progress')
    .update({ last_lesson_id: lessonId, last_accessed: visitedAt })
    .eq('user_id', actor).eq('course_id', courseId).select('*').maybeSingle() as AcademyBoundQuery,
  insertResume: (actor, courseId, lessonId, visitedAt) => db.from('lms_course_progress')
    .upsert({ user_id: actor, course_id: courseId, last_lesson_id: lessonId, last_accessed: visitedAt },
      { onConflict: 'user_id,course_id', ignoreDuplicates: true }) as AcademyBoundQuery,
});
export const academyApi = createAcademyApi(supabase.rpc.bind(supabase) as unknown as AcademyRpc, actorScope);
