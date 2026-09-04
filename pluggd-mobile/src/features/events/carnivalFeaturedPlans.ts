type CuratedEventSlot<T> = {
  event?: T | null;
};

/**
 * Preserve admin curation for the Carnival feature rail without allowing
 * ineligible rows, duplicates or the chronological Top Pick into the rail.
 * Chronological events fill only the slots that curation does not fill.
 */
export function resolveCarnivalFeaturedPlans<T extends { id: string }>(
  curatedItems: readonly CuratedEventSlot<T>[] | null | undefined,
  eligibleChronologicalEvents: readonly T[],
  topPickId?: string | null,
  limit = 6,
): T[] {
  if (limit <= 0) return [];

  const eligibleById = new Map(eligibleChronologicalEvents.map((event) => [event.id, event]));
  const seen = new Set<string>();
  if (topPickId) seen.add(topPickId);

  const featured: T[] = [];
  const append = (event: T | null | undefined) => {
    if (!event || seen.has(event.id)) return;
    const eligible = eligibleById.get(event.id);
    if (!eligible) return;
    seen.add(event.id);
    featured.push(eligible);
  };

  for (const item of curatedItems ?? []) {
    append(item.event);
    if (featured.length >= limit) return featured;
  }

  for (const event of eligibleChronologicalEvents) {
    append(event);
    if (featured.length >= limit) break;
  }

  return featured;
}
