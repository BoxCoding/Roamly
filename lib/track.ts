import {getDb} from '../db';
import {events} from '../db/schema';

// Record a product event; never fails the request that triggered it.
export function track(name: string, userId: string | null, props: Record<string, string | number | boolean> = {}) {
  return getDb().insert(events).values({id: crypto.randomUUID(), name, userId, props: JSON.stringify(props), at: new Date().toISOString()}).catch(() => {});
}
