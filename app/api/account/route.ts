import { eq } from 'drizzle-orm';
import { getDb } from '../../../db';
import { aiQuota, crewMembers, crewReports, crews, profiles, users } from '../../../db/schema';
import { clearSessionCookie, getUser } from '../../auth';
import { json, readJson } from '../../../lib/http';
export const dynamic = 'force-dynamic';

// Deletes everything stored for the signed-in rider: account, profile, AI quota, crews they organize
// (members and reports go with them), memberships and reports they filed.
export async function DELETE(request: Request) {
  const user = await getUser(); if (!user) return json({ error: 'Sign in to delete your account.' }, 401);
  const req = await readJson(request, 200); if ('error' in req) return req.error;
  if ((req.body as { confirm?: unknown })?.confirm !== 'DELETE') return json({ error: 'Type DELETE to confirm.' }, 400);
  const uid = user.userId;
  try {
    await getDb().transaction(async tx => {
      await tx.delete(crews).where(eq(crews.organizerId, uid));
      await tx.delete(crewMembers).where(eq(crewMembers.userId, uid));
      await tx.delete(crewReports).where(eq(crewReports.reporterId, uid));
      await tx.delete(profiles).where(eq(profiles.userId, uid));
      await tx.delete(aiQuota).where(eq(aiQuota.userId, uid));
      if (uid.startsWith('user:')) await tx.delete(users).where(eq(users.id, uid.slice(5)));
    });
    const response = json({ deleted: true });
    response.headers.append('Set-Cookie', clearSessionCookie());
    return response;
  } catch { return json({ error: 'Your account was not deleted. Please try again.' }, 503); }
}
