// Saved, editable trip plans: one route split into days, each with a stretch, a stay and stops.
import {z} from 'zod';
import {STAY_TYPES,VEHICLES} from '../public/domain.mjs';
import {coverField,tagsField} from './ride-schema.mjs';

const name = max => z.string().trim().max(max);
const names = (n, max) => z.array(z.string().trim().min(1).max(max)).max(n).default([]);
export const planDay = z.object({
  day: z.number().int().min(1).max(30),
  from: name(80).min(1, 'Every day needs a start.'), to: name(80).min(1, 'Every day needs an end.'),
  km: z.number().int().min(0).max(1500),
  stayArea: name(100).default(''), stayType: z.enum(['', ...STAY_TYPES]).default(''), stayBand: z.enum(['Budget', 'Comfort', 'Premium']).default('Comfort'),
  places: names(5, 80), fuelStops: names(5, 80), notes: name(300).default(''),
}).strict();
export const planSettings = z.object({
  people: z.number().int().min(1).max(30), vehicle: z.enum(['Bike', 'Car']), fuel: z.enum(['Petrol', 'Diesel', 'Hybrid', 'Electric']),
  mileage: z.number().min(1).max(200), fuelPrice: z.number().min(1).max(1000), seats: z.number().int().min(1).max(8), month: z.number().int().min(0).max(11),
}).strict().refine(s => s.seats <= VEHICLES[s.vehicle].maxSeats, {message: 'Too many seats for this vehicle.'});
export const planSchema = z.object({
  title: name(80).min(1, 'Give your plan a name.'),
  routeId: z.string().min(1).max(40),
  settings: planSettings,
  days: z.array(planDay).min(1).max(30).refine(d => d.every((x, i) => x.day === i + 1), {message: 'Days must be numbered in order.'}),
  cover: coverField,
  tags: tagsField,
}).strict();
export const MAX_PLANS = 20;
