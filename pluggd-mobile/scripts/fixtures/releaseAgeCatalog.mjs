// Local canonical catalogue/auth fixture shared by playback integration tests.
// Unknown identities fail closed; no live credentials or network requests.
export function releaseAgeCatalog({ session = () => null, releaseRows = [], trackRows = [], dob = '1990-01-01' } = {}) {
  const calls = [];
  return {
    calls,
    auth: { getSession: async () => ({ data: { session: session() } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    from(table) {
      const entry = { table, filters: [] }; calls.push(entry);
      const result = () => ({ data: (table === 'releases' ? releaseRows : table === 'tracks' ? trackRows
        : table === 'profile_private_demographics' && session()?.user.id ? [{ user_id: session().user.id, date_of_birth: typeof dob === 'function' ? dob() : dob }] : [])
        .filter(row => entry.filters.every(([key, value]) => row[key] === value)), error: null });
      return { select() { return this; }, eq(key, value) { entry.filters.push([key, value]); return this; },
        maybeSingle: async () => ({ ...result(), data: result().data[0] || null }),
        then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); } };
    },
  };
}
