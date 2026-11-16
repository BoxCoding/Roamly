import {z} from 'zod';
import {sessionCookie,sessionSecret} from '../../../auth';
import {redeemAppCode} from '../../../../lib/app-login';
import {json,readJson} from '../../../../lib/http';
export const dynamic='force-dynamic';

// The mobile app redeems the code it received on roamly://auth (with its PKCE verifier) for a session in its WebView.
export async function POST(request:Request){
  const req=await readJson(request,2000);if('error' in req)return req.error;
  const parsed=z.object({code:z.string().min(10).max(1500),verifier:z.string().min(43).max(128)}).strict().safeParse(req.body);
  if(!parsed.success)return json({error:'Invalid sign-in code.'},400);
  try{
    const user=await redeemAppCode(parsed.data.code,parsed.data.verifier,await sessionSecret());
    if(!user)return json({error:'This sign-in link expired. Please try again.'},401);
    const response=json({signedIn:true});
    for(const c of await sessionCookie(user))response.headers.append('Set-Cookie',c);
    return response;
  }catch{return json({error:'Sign-in failed. Please try again.'},503)}
}
