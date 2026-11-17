import {z} from 'zod';
import {getUser} from '../../../auth';
import {json,readJson} from '../../../../lib/http';
import {COVER_URL} from '../../../../lib/ride-schema.mjs';
import {suggestRideMedia} from '../../../../lib/ride-media';
export const dynamic='force-dynamic';

const input=z.object({title:z.string().trim().min(1).max(80),route:z.string().trim().min(1).max(300),description:z.string().trim().max(600).default(''),vehicle:z.enum(['Bike','Car'])}).strict();

// Tags and cover photo ideas for the ride form. Suggestions are only kept if the lead saves them with the ride.
export async function POST(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in first.'},401);
  const req=await readJson(request,1500);if('error' in req)return req.error;
  const parsed=input.safeParse(req.body);if(!parsed.success)return json({error:'Add a ride title and route first.'},400);
  const out=await suggestRideMedia(parsed.data);
  return json({...out,images:out.images.filter(i=>COVER_URL.test(i.url))});
}
