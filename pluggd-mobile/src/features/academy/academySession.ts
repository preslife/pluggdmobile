import type { AcademyActorScope, AcademyRpcResult, Row } from './academyApi';

type SessionSnapshot = { user: { id: string }; access_token: string };
type SessionResult = { data: { session: SessionSnapshot | null }; error?: unknown };
export type AcademyBoundQuery = PromiseLike<AcademyRpcResult> & {
  setHeader(name: string, value: string): AcademyBoundQuery;
  abortSignal(signal: AbortSignal): AcademyBoundQuery;
};
export interface AcademySessionTransport {
  session(): PromiseLike<SessionResult>;
  subscribe(listener: (event: string) => void): () => void;
  rpc(name: string, args: Row): AcademyBoundQuery;
  updateResume(actor: string, courseId: string, lessonId: string, visitedAt: string): AcademyBoundQuery;
  insertResume(actor: string, courseId: string, lessonId: string, visitedAt: string): AcademyBoundQuery;
}

/** Each operation keeps its initiating bearer; an account switch cannot retarget it. */
export function createAcademyActorScope(transport: AcademySessionTransport): AcademyActorScope {
  return async (actor, operation) => {
    const controller = new AbortController();
    let changed = false;
    const unsubscribe = transport.subscribe(event => {
      if (event !== 'INITIAL_SESSION') { changed = true; controller.abort(); }
    });
    try {
      const initial = await transport.session();
      const session = initial.data.session;
      if (initial.error || !session || session.user.id !== actor || !session.access_token || changed) throw new Error('academy_session_changed');
      const token = session.access_token;
      const current = async () => {
        if (changed || controller.signal.aborted) throw new Error('academy_session_changed');
        const next = await transport.session();
        if (changed || next.error || next.data.session?.user.id !== actor || next.data.session?.access_token !== token) throw new Error('academy_session_changed');
      };
      const send = async (build: () => AcademyBoundQuery) => {
        await current();
        // The installed client preserves an explicit Authorization header.
        const result = await build().setHeader('Authorization', `Bearer ${token}`).abortSignal(controller.signal);
        await current();
        return result;
      };
      return await operation({
        rpc: (name, args) => send(() => transport.rpc(name, args)),
        resumeLms: async (courseId, lessonId) => {
          const visitedAt = new Date().toISOString();
          let result = await send(() => transport.updateResume(actor, courseId, lessonId, visitedAt));
          if (result.error || result.data != null) return result;
          // A new learner has no row yet. Let existing server defaults initialise
          // completion, and DO NOTHING if the website creates the row meanwhile.
          const created = await send(() => transport.insertResume(actor, courseId, lessonId, visitedAt));
          if (created.error) return created;
          result = await send(() => transport.updateResume(actor, courseId, lessonId, visitedAt));
          if (!result.error && result.data == null) throw new Error('academy_request_failed');
          return result;
        },
      });
    } finally { unsubscribe(); }
  };
}
