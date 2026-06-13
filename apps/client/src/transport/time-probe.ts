/** Optional V1 network-time sanity check (research R8): when online, compare
 *  the local clock against the HTTP Date header and flag drift. Never blocks
 *  play — offline simply skips it. */
export async function probeNetworkTime(): Promise<number | null> {
  try {
    const res = await fetch('/', { method: 'HEAD', cache: 'no-store' });
    const header = res.headers.get('date');
    if (!header) return null;
    const driftMs = Date.now() - new Date(header).getTime();
    if (Math.abs(driftMs) > 5 * 60_000) {
      console.warn(
        `[time] local clock differs from network time by ${Math.round(driftMs / 1000)}s`,
      );
    }
    return driftMs;
  } catch {
    return null;
  }
}
