/** Public release links use both canonical UUIDs and editorial slugs. Values
 * are always passed through an equality filter, never interpolated into OR SQL. */
export function releaseReference(reference: unknown): { column: 'id' | 'slug'; value: string } | null {
  if (typeof reference !== 'string' || !reference || reference.length > 200) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reference)) return { column: 'id', value: reference };
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(reference)) return { column: 'slug', value: reference };
  return null;
}
