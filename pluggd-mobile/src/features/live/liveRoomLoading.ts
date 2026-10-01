/** Primary room failures must reach the query cache rather than become an empty lobby. */
export async function requireLiveRooms<T>(request: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const { data, error } = await request;
  if (error) throw new Error('Live rooms could not be loaded. Please try again.');
  return data || [];
}
