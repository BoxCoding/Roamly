// Community feed rules: post and road-report input, limits and rider badges.
import {z} from 'zod';

export const REPORT_TYPES = {road: 'Road condition', fuel: 'Fuel / charging', police: 'Police check', weather: 'Weather', closure: 'Closure / diversion', stay: 'Stay / food'};
export const CONDITIONS = {good: 'Good', caution: 'Caution', bad: 'Bad'};
export const POSTS_PER_DAY = 20, COMMENTS_PER_DAY = 100, HIDE_POST_AFTER = 3, PAGE = 20;
export const INTEL_DAYS = 30;

const body = max => z.string().trim().min(1, 'Write something first.').max(max, `Keep it under ${max} characters.`);
export const postInput = z.object({
  kind: z.enum(['post', 'report']).default('post'),
  body: body(1000),
  routeId: z.string().max(40).default(''),
  place: z.string().trim().max(80).default(''),
  reportType: z.enum(['', ...Object.keys(REPORT_TYPES)]).default(''),
  condition: z.enum(['', ...Object.keys(CONDITIONS)]).default(''),
  crewId: z.string().uuid().nullable().default(null),
}).strict().superRefine((p, ctx) => {
  if (p.kind === 'report' && (!p.reportType || !p.condition || p.place.length < 2)) ctx.addIssue({code: 'custom', message: 'Road reports need a place, a type and a condition.'});
  if (p.kind === 'post' && (p.reportType || p.condition)) ctx.addIssue({code: 'custom', message: 'Only road reports have a type and condition.'});
});
export const commentInput = z.object({body: body(500)}).strict();
export const postReportInput = z.object({reason: z.enum(['spam', 'scam', 'unsafe', 'offensive', 'fake', 'other'])}).strict();
export const followInput = z.object({type: z.enum(['rider', 'crew']), id: z.string().min(1).max(64), follow: z.boolean()}).strict();

// Badges from real activity only: completed rides (RSVP going, ride finished, not cancelled), km, road reports, leading.
export const BADGES = [
  {id: 'first-ride', label: 'First group ride', test: s => s.rides >= 1},
  {id: 'regular', label: 'Road regular · 5 rides', test: s => s.rides >= 5},
  {id: 'km-1000', label: '1,000 km club', test: s => s.km >= 1000},
  {id: 'km-5000', label: '5,000 km club', test: s => s.km >= 5000},
  {id: 'tourer', label: 'Multi-day tourer', test: s => s.longestDays >= 3},
  {id: 'scout', label: 'Road scout · 5 reports', test: s => s.reports >= 5},
  {id: 'leader', label: 'Ride leader', test: s => s.ledRides >= 1},
];
export const badgesFor = stats => BADGES.filter(b => b.test(stats)).map(({id, label}) => ({id, label}));
