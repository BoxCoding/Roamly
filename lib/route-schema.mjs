// Trip routes as stored in the database: the same shape as public/catalog.mjs, validated when admins add or edit one.
import {z} from 'zod';
import {coverField} from './ride-schema.mjs';

export const LEVELS = ['Easy going', 'Moderate', 'Challenging'];
export const SEASONS = ['Summer', 'Monsoon', 'Autumn', 'Winter'];
// Months (0 = January) to the season filter in Discover.
const SEASON_OF = m => [2, 3, 4].includes(m) ? 'Summer' : [5, 6, 7, 8].includes(m) ? 'Monsoon' : [9, 10].includes(m) ? 'Autumn' : 'Winter';
const text = (max, label) => z.string().trim().min(1, `Enter the ${label}.`).max(max, `The ${label} is too long.`);

export const routeInput = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,40}$/, 'Route ID: 2-40 lowercase letters, numbers or dashes.'),
  title: text(80, 'title'), location: text(60, 'state or region'), route: text(150, 'route line'),
  vehicle: z.enum(['Bike', 'Car']), days: z.number().int().min(1).max(30), km: z.number().int().min(1).max(5000),
  level: z.enum(LEVELS), tag: z.string().trim().max(60).default(''),
  desc: text(600, 'description'), risk: z.string().trim().max(400).default(''),
  months: z.array(z.number().int().min(0).max(11)).min(1, 'Pick at least one good month.').max(12),
  places: z.array(z.object({name: text(80, 'place'), minutes: z.number().int().min(10).max(600), area: text(80, 'place area'), stayArea: text(80, 'stay area')}).strict()).min(1, 'Add at least one place.').max(12),
  stops: z.array(z.object({name: text(80, 'stop'), purpose: z.string().trim().max(200).default('Meal, fuel/charging and rest search area; verify facilities before arrival.')}).strict()).max(10).default([]),
  stays: z.array(z.object({area: text(80, 'stay area'), type: z.string().trim().max(60).default('Homestay, guesthouse or hotel'), min: z.number().int().min(100).max(100000), max: z.number().int().min(100).max(200000)}).strict()).min(1, 'Add at least one stay area.').max(8),
  source: z.string().trim().max(300).regex(/^(https:\/\/\S+)?$/, 'Source must be an https link.').default(''),
  cover: coverField.refine(c => c, 'Choose a cover photo.'),
  tags: z.array(z.string().trim().min(1).max(24)).max(5).default([]),
}).strict().superRefine((r, ctx) => {
  const areas = new Set(r.stays.map(s => s.area));
  for (const p of r.places) if (!areas.has(p.stayArea)) ctx.addIssue({code: 'custom', message: `“${p.name}” uses stay area “${p.stayArea}”, which is not in the stays list.`});
  for (const s of r.stays) if (s.min > s.max) ctx.addIssue({code: 'custom', message: `${s.area}: the lowest price is above the highest.`});
});

// The stored route: place IDs and seasons are derived, so the planner and AI checks keep working unchanged.
export const toRoute = r => ({...r, seasons: [...new Set(r.months.map(SEASON_OF))], places: r.places.map((p, i) => ({id: `${r.id}-p${i}`, ...p}))});
