import {z} from 'zod';
import {linksField} from './profile-schema.mjs';

const text = (max, label) => z.string().trim().min(1, `Enter the ${label}.`).max(max, `The ${label} is too long.`);
export const crewInput = z.object({
  name: text(60, 'group name'), city: text(60, 'home city'), vehicle: z.enum(['Bike', 'Car']),
  meetup: text(100, 'meeting area'), cadence: text(100, 'ride cadence'), description: text(300, 'description'),
  links: linksField(['whatsapp', 'telegram', 'instagram', 'youtube', 'facebook', 'website']),
  visibility: z.enum(['public', 'private']).default('public'),
}).strict();
export const crewUpdateInput = crewInput.extend({id: z.string().uuid()}).strict();
// Owner and co-lead actions on a member, addressed by the member's public rider ID.
export const MEMBER_ACTIONS = ['approve', 'reject', 'remove', 'promote', 'demote'];
export const memberActionInput = z.object({id: z.string().uuid(), rider: z.string().regex(/^[a-f0-9]{12}$/), action: z.enum(MEMBER_ACTIONS)}).strict();
// Who may do what to whom. Returns the error message, or '' when allowed.
export function memberActionError(actorRole, target, action) {
  if (!['owner', 'colead'].includes(actorRole)) return 'Only the group owner or a co-lead can manage members.';
  if (!target) return 'That rider is not in this group.';
  if (target.role === 'owner') return 'The owner cannot be changed here.';
  if (action === 'approve' || action === 'reject') return target.status === 'pending' ? '' : 'There is no pending request from this rider.';
  if (target.status !== 'active') return 'Approve or reject this request first.';
  if (action === 'remove') return actorRole === 'owner' || target.role === 'member' ? '' : 'Only the owner can remove a co-lead.';
  if (actorRole !== 'owner') return 'Only the owner can change co-leads.';
  if (action === 'promote') return target.role === 'member' ? '' : 'This rider is already a co-lead.';
  return target.role === 'colead' ? '' : 'This rider is not a co-lead.';
}
export const membershipInput = z.object({id: z.string().uuid(), joined: z.boolean()}).strict();
export const crewIdInput = z.object({id: z.string().uuid()}).strict();
// Spam brake on top of reports and moderation.
export const MAX_CREWS_PER_ORGANIZER = 5;

// Reports: one per rider per crew; enough distinct reports hide a crew until a moderator reviews it.
export const REPORT_REASONS = {spam: 'Spam or advertising', scam: 'Scam or asks for money', unsafe: 'Unsafe riding or meetups', offensive: 'Offensive or hateful', fake: 'Fake or misleading', other: 'Something else'};
export const HIDE_AFTER_REPORTS = 3;
export const reportInput = z.object({id: z.string().uuid(), reason: z.enum(Object.keys(REPORT_REASONS)), note: z.string().trim().max(300).default('')}).strict();
export const moderationInput = z.object({id: z.string().uuid(), action: z.enum(['restore', 'remove'])}).strict();
