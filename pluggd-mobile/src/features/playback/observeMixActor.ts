import { supabase } from '../../lib/supabase';
import { mixAccessSession } from './mixAccessSession';

let users = 0;
let dispose: (() => void) | undefined;

/** Observe SDK identity without changing authentication, session storage or
 * launch-access policy. Shared by the mounted provider and playback service.
 */
export function observeMixActor(): () => void {
  users++;
  if (!dispose) {
    let active = true;
    let receivedEvent = false;
    let receivedIdentityChange = false;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || (event === 'INITIAL_SESSION' && receivedIdentityChange)) return;
      receivedEvent = true;
      if (event !== 'INITIAL_SESSION') receivedIdentityChange = true;
      mixAccessSession.bindActor(session?.user.id ?? null);
    });
    void supabase.auth.getSession().then(({ data: snapshot }) => {
      if (active && !receivedEvent) mixAccessSession.bindActor(snapshot.session?.user.id ?? null);
    }).catch(() => {
      if (active && !receivedEvent) mixAccessSession.bindActor(null);
    });
    dispose = () => { active = false; data.subscription.unsubscribe(); };
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    users--;
    if (users === 0) { dispose?.(); dispose = undefined; }
  };
}
