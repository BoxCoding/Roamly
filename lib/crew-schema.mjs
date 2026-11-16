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
// Spam brake on top of reports and moderation.
export const MAX_CREWS_PER_ORGANIZER = 5;

// Reports: one per rider per crew; enough distinct reports hide a crew until a moderator reviews it.
export const REPORT_REASONS = {spam: 'Spam or advertising', scam: 'Scam or asks for money', unsafe: 'Unsafe riding or meetups', offensive: 'Offensive or hateful', fake: 'Fake or misleading', other: 'Something else'};
export const HIDE_AFTER_REPORTS = 3;
export const reportInput = z.object({id: z.string().uuid(), reason: z.enum(Object.keys(REPORT_REASONS)), note: z.string().trim().max(300).default('')}).strict();
export const moderationInput = z.object({id: z.string().uuid(), action: z.enum(['restore', 'remove'])}).strict();
