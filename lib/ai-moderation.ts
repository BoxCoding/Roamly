import {eq} from 'drizzle-orm';
import {env} from './env';
import {getDb} from '../db';
import {posts} from '../db/schema';
import {generateJson} from './gemini';
import {MODERATION_INSTRUCTION,shouldHide,verdictSchema} from './moderation.mjs';

/** One small AI check (~200 tokens). Hides the post when the AI is confident it breaks the rules. Never throws. */
export async function aiReview(postId:string,text:string){
  if(!env.GEMINI_API_KEY)return null;
  try{
    const v=verdictSchema.z.parse(await generateJson(MODERATION_INSTRUCTION,{text:text.slice(0,1000)},verdictSchema.j,120));
    if(shouldHide(v))await getDb().update(posts).set({status:'hidden'}).where(eq(posts.id,postId));
    return v;
  }catch{return null}
}
