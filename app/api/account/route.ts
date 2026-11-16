import { and, eq, or } from 'drizzle-orm';
import { getDb } from '../../../db';
import { accounts, aiQuota, comments, crewMembers, crewReports, crews, follows, notifications, plans, postReactions, postReports, posts, profiles, rideRsvps, rideUpdates, uploads, users } from '../../../db/schema';
import { clearSessionCookie, getUser } from '../../auth';
import { json, readJson } from '../../../lib/http';
import { deletePhotos } from '../../../lib/photos';
export const dynamic = 'force-dynamic';

// Deletes everything stored for the signed-in rider: account, profile, AI quota, crews they organize
// (members and reports go with them), memberships and reports they filed.
export async function DELETE(request: Request) {
  const user = await getUser(); if (!user) return json({ error: 'Sign in to delete your account.' }, 401);
  const req = await readJson(request, 200); if ('error' in req) return req.error;
  if ((req.body as { confirm?: unknown })?.confirm !== 'DELETE') return json({ error: 'Type DELETE to confirm.' }, 400);
  const uid = user.userId;
  try {
    const photoKeys = (await getDb().select({ key: uploads.key }).from(uploads).where(eq(uploads.userId, uid))).map(u => u.key);
    await getDb().transaction(async tx => {
      await tx.delete(crews).where(eq(crews.organizerId, uid));
      await tx.delete(crewMembers).where(eq(crewMembers.userId, uid));
      await tx.delete(crewReports).where(eq(crewReports.reporterId, uid));
      await tx.delete(profiles).where(eq(profiles.userId, uid));
      await tx.delete(aiQuota).where(eq(aiQuota.userId, uid));
      await tx.delete(rideRsvps).where(eq(rideRsvps.userId, uid));
      await tx.delete(rideUpdates).where(eq(rideUpdates.authorId, uid));
      await tx.delete(plans).where(eq(plans.userId, uid));
      await tx.delete(posts).where(eq(posts.authorId, uid));
      await tx.delete(comments).where(eq(comments.authorId, uid));
      await tx.delete(postReactions).where(eq(postReactions.userId, uid));
      await tx.delete(postReports).where(eq(postReports.reporterId, uid));
      await tx.delete(follows).where(or(eq(follows.followerId, uid), and(eq(follows.targetType, 'rider'), eq(follows.targetId, uid))));
      await tx.delete(notifications).where(eq(notifications.userId, uid));
      await tx.delete(uploads).where(eq(uploads.userId, uid));
      await tx.delete(accounts).where(eq(accounts.userId, uid));
      if (uid.startsWith('user:')) await tx.delete(users).where(eq(users.id, uid.slice(5)));
    });
    await deletePhotos(photoKeys);
    const response = json({ deleted: true });
    response.headers.append('Set-Cookie', clearSessionCookie());
    return response;
  } catch { return json({ error: 'Your account was not deleted. Please try again.' }, 503); }
}
