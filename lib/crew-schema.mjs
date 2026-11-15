import {z} from 'zod';
import {linksField} from './profile-schema.mjs';

const text = (max, label) => z.string().trim().min(1, `Enter the ${label}.`).max(max, `The ${label} is too long.`);
export const crewInput = z.object({
  name: text(60, 'group name'), city: text(60, 'home city'), vehicle: z.enum(['Bike', 'Car']),
  meetup: text(100, 'meeting area'), cadence: text(100, 'ride cadence'), description: text(300, 'description'),
  links: linksField(['whatsapp', 'telegram', 'instagram', 'youtube', 'facebook', 'website']),
}).strict();
export const membershipInput = z.object({id: z.string().uuid(), joined: z.boolean()}).strict();
export const crewIdInput = z.object({id: z.string().uuid()}).strict();
// shortcut: per-organizer cap instead of moderation; add reporting/moderation before wide launch.
export const MAX_CREWS_PER_ORGANIZER = 5;
