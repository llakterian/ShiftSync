import postgres from 'postgres';

/*
 * Supabase pooler connection handling.
 *
 * - Transaction mode (:6543) does NOT support LISTEN/NOTIFY — each statement may
 *   run on a different pooled backend connection, so `listen` never receives
 *   notifications. Session mode (:5432) pins one backend per client connection
 *   and works. See Supabase docs: "Session mode ... supports LISTEN".
 * - Writes/reads elsewhere in the app keep using DATABASE_URL as-is.
 */
export function listenConnectionString(): string {
  const url = process.env.DATABASE_URL!;
  return url.replace(':6543', ':5432');
}

export function makeListenClient(): ReturnType<typeof postgres> {
  return postgres(listenConnectionString(), {
    max: 1, // A listener holds one pinned session connection
    idle_timeout: 0, // Never close: LISTEN would silently die
    connect_timeout: 10,
  });
}
