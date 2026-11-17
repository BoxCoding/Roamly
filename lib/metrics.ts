import {sql} from 'drizzle-orm';
import {getDb} from '../db';

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();

// Launch health from the events table. Activation: a new rider joined a crew, created one or said "going" within 7 days of signing up.
// Week-4 retention: riders who signed up 28–56 days ago and were active in the last 7 days.
export async function launchMetrics() {
  const db = getDb();
  const active = (days: number) => db.execute(sql`select count(distinct user_id)::int as n from events where user_id is not null and at >= ${iso(days)}`);
  const [dau, wau, mau, act, ret] = await Promise.all([active(1), active(7), active(30),
    db.execute(sql`select count(*)::int as cohort, count(*) filter (where exists (
        select 1 from events e where e.user_id = a.user_id and e.name in ('crew_joined','crew_created','rsvp_going') and e.at <= to_char((a.created_at::timestamptz + interval '7 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))::int as done
      from accounts a where a.created_at >= ${iso(30)}`),
    db.execute(sql`select count(*)::int as cohort, count(*) filter (where exists (select 1 from events e where e.user_id = a.user_id and e.at >= ${iso(7)}))::int as done
      from accounts a where a.created_at >= ${iso(56)} and a.created_at < ${iso(28)}`)]);
  const n = (r: {rows: Record<string, unknown>[]}, k = 'n') => Number(r.rows[0]?.[k] ?? 0);
  const pct = (r: {rows: Record<string, unknown>[]}) => n(r, 'cohort') ? Math.round(100 * n(r, 'done') / n(r, 'cohort')) : null;
  return {dau: n(dau), wau: n(wau), mau: n(mau), activationPct: pct(act), activationCohort: n(act, 'cohort'), week4RetentionPct: pct(ret), week4Cohort: n(ret, 'cohort')};
}
