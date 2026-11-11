import { courseMetadata, isStrictlyFreeLegacy, isStrictlyFreeLms, object, parseLessons, parseProgress, UUID,
  type AcademyCourse, type AcademyDetail, type AcademyProgress, type Row } from './contracts';

export type AcademyRpcResult = { data: unknown; error: { code?: string; message: string } | null };
export type AcademyRpc = (name: string, args: Row) => PromiseLike<AcademyRpcResult>;
export type { Row } from './contracts';
export interface AcademyActorClient {
  rpc: AcademyRpc;
  resumeLms(courseId: string, lessonId: string): PromiseLike<AcademyRpcResult>;
}
export type AcademyActorScope = <T>(actor: string, operation: (client: AcademyActorClient) => Promise<T>) => Promise<T>;
export class AcademyUnavailableError extends Error { constructor() { super('course_unavailable'); } }
const PAGE = 24;

// The same RPCs power the website. No local progress cache, alternate content store or checkout.
export function createAcademyApi(rpc: AcademyRpc, actorScope?: AcademyActorScope) {
  function ownActor<T>(actor: string, operation: (client: AcademyActorClient) => Promise<T>): Promise<T> {
    if (!actorScope) throw new Error('academy_session_required');
    return actorScope(actor, operation);
  }
  async function call(name: string, args: Row) {
    const result = await rpc(name, args);
    if (result.error) throw new Error('academy_request_failed');
    return result.data;
  }

  async function lmsMetadata(identifier: string) {
    const result = await rpc('get_lms_course_detail', { p_slug: identifier, p_include_lessons: false });
    if (result.error) {
      if (result.error.code === 'P0001' && result.error.message === 'course_not_found') return null;
      throw new Error('academy_request_failed');
    }
    if (!object(result.data) || !object(result.data.course)) throw new Error('invalid_course');
    return result.data;
  }

  function freeLmsDetail(value: unknown): value is Row & { course: Row } {
    return object(value) && isStrictlyFreeLms(value.course) && object(value.access)
      && value.access.granted === true && value.access.requires_purchase === false
      && value.access.requires_membership === false && value.access.required_tier === 'free';
  }

  async function catalogue(offset = 0, query = ''): Promise<{ courses: AcademyCourse[]; nextOffset: number | null }> {
    const search = query.trim().toLocaleLowerCase();
    const lms = await call('get_lms_courses', { p_limit: PAGE, p_offset: offset, p_visibility: 'public', p_query: search || null });
    if (!Array.isArray(lms)) throw new Error('invalid_catalogue');
    const courses: AcademyCourse[] = [];
    // The catalogue RPC has no pricing object. Confirm pricing without loading lessons before showing a card.
    const candidates = lms.filter(row => object(row) && row.price_cents === 0 && typeof row.slug === 'string');
    for (let i = 0; i < candidates.length; i += 4) {
      const checked = await Promise.all(candidates.slice(i, i + 4).map(row => lmsMetadata(row.slug)));
      for (const detail of checked) if (freeLmsDetail(detail)) courses.push(courseMetadata(detail.course, 'lms'));
    }
    if (offset === 0) {
      const legacy = await call('get_legacy_course_catalogue', { p_limit: 100 });
      if (!Array.isArray(legacy)) throw new Error('invalid_catalogue');
      courses.push(...legacy.filter(isStrictlyFreeLegacy).map(row => courseMetadata(row, 'legacy'))
        .filter(course => `${course.title} ${course.description}`.toLocaleLowerCase().includes(search)));
    }
    return { courses, nextOffset: lms.length === PAGE ? offset + PAGE : null };
  }

  async function detail(identifier: string): Promise<AcademyDetail> {
    const metadata = await lmsMetadata(identifier);
    if (metadata) {
      if (!freeLmsDetail(metadata)) throw new AcademyUnavailableError();
      const value = await call('get_lms_course_detail', { p_slug: identifier, p_include_lessons: true });
      // Recheck the actual lesson response too: pricing may change between requests.
      if (!freeLmsDetail(value) || value.course.id !== metadata.course.id) throw new AcademyUnavailableError();
      return { course: courseMetadata(value.course, 'lms'), lessons: parseLessons(value.lessons, 'lms') };
    }
    // A UUID-shaped LMS slug still wins. Auth/network/schema errors never fall through to legacy.
    if (!UUID.test(identifier)) throw new AcademyUnavailableError();
    const rows = await call('get_legacy_course_catalogue', { p_course_id: identifier, p_limit: 1 });
    if (!Array.isArray(rows)) throw new Error('invalid_catalogue');
    if (!isStrictlyFreeLegacy(rows[0]) || rows[0].id !== identifier) throw new AcademyUnavailableError();
    const value = await call('get_legacy_course_reader', { p_course_id: identifier });
    if (!object(value) || !isStrictlyFreeLegacy(value.course) || value.course.id !== identifier
        || !object(value.access) || value.access.granted !== true) throw new AcademyUnavailableError();
    return { course: courseMetadata(value.course, 'legacy'), lessons: parseLessons(value.lessons, 'legacy') };
  }

  async function progress(actor: string, value: AcademyDetail): Promise<AcademyProgress> {
    return ownActor(actor, async scoped => {
      const result = await scoped.rpc(value.course.system === 'lms' ? 'get_lms_course_progress' : 'get_legacy_course_progress',
        { p_course_id: value.course.id, p_user_id: actor });
      if (result.error) throw new Error('academy_request_failed');
      if (result.data == null && value.course.system === 'lms') return { completed: [], lastLessonId: null, percent: 0 };
      return parseProgress(result.data, actor, value.course.id, value.lessons);
    });
  }

  async function save(actor: string, value: AcademyDetail, lessonId: string, completed: boolean | null): Promise<AcademyProgress> {
    if (!value.lessons.some(lesson => lesson.id === lessonId)) throw new Error('invalid_lesson');
    return ownActor(actor, async scoped => {
      // Recheck free admission using the same initiating account before writing.
      const current = await createAcademyApi(scoped.rpc).detail(value.course.identifier);
      if (current.course.id !== value.course.id || current.course.system !== value.course.system
          || !current.lessons.some(lesson => lesson.id === lessonId)) throw new AcademyUnavailableError();
      const result = value.course.system === 'lms' && completed === null
        ? await scoped.resumeLms(value.course.id, lessonId)
        : await scoped.rpc(value.course.system === 'lms' ? 'record_lms_lesson_progress' : 'record_legacy_lesson_progress', {
          p_course_id: value.course.id, p_lesson_id: lessonId, p_completed: completed, p_user_id: actor,
          ...(value.course.system === 'lms' ? { p_time_spent_seconds: 0 } : {}),
        });
      if (result.error) throw new Error('academy_request_failed');
      return parseProgress(result.data, actor, value.course.id, current.lessons);
    });
  }
  return { catalogue, detail, progress, save };
}
