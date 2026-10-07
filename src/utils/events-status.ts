export type EventsStatusKind = 'ready' | 'loading' | 'error' | 'empty';

export type EventsStatusInput = {
  loading: boolean;
  error: Error | null;
  empty: boolean;
};

/** Content always wins: a stale list beats a spinner or an error after a failed reload. */
export function resolveEventsStatus({ loading, error, empty }: EventsStatusInput): EventsStatusKind {
  if (!empty) return 'ready';
  if (loading) return 'loading';
  if (error) return 'error';
  return 'empty';
}
