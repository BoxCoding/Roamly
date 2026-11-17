import {and,count,eq,gte} from 'drizzle-orm';
import {getDb} from '../../../db';
import {uploads} from '../../../db/schema';
import {getUser} from '../../auth';
import {MAX_UPLOAD_BYTES,UPLOADS_PER_DAY,processImage,savePhoto} from '../../../lib/photos';
import {json,publicOrigin} from '../../../lib/http';
export const dynamic='force-dynamic';

// Raw image body (image/jpeg, image/png or image/webp). Returns the stored photo's key and URL.
export async function POST(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in to upload photos.'},401);
  if(request.headers.get('origin')!==publicOrigin(request))return json({error:'Invalid request origin.'},403);
  if(!/^image\/(jpeg|png|webp)$/.test(request.headers.get('content-type')||''))return json({error:'Upload a JPEG, PNG or WebP photo.'},415);
  if(Number(request.headers.get('content-length'))>MAX_UPLOAD_BYTES)return json({error:'Photos must be under 20 MB.'},413);
  try{
    const db=getDb(),[{n}]=await db.select({n:count()}).from(uploads).where(and(eq(uploads.userId,user.userId),gte(uploads.createdAt,new Date(Date.now()-86400000).toISOString())));
    if(n>=UPLOADS_PER_DAY)return json({error:`You can upload up to ${UPLOADS_PER_DAY} photos a day.`},429);
    const raw=Buffer.from(await request.arrayBuffer());
    if(raw.length>MAX_UPLOAD_BYTES)return json({error:'Photos must be under 20 MB.'},413);
    let photo;try{photo=await processImage(raw)}catch(error){return json({error:(error as Error).message.startsWith('Upload')?(error as Error).message:'That file is not a photo we can read.'},400)}
    const key=crypto.randomUUID().replace(/-/g,'')+'.webp';
    await savePhoto(key,photo.data);
    await db.insert(uploads).values({key,userId:user.userId,bytes:photo.data.length,width:photo.width,height:photo.height,createdAt:new Date().toISOString()});
    return json({key,url:'/api/photos/'+key,width:photo.width,height:photo.height},201);
  }catch{return json({error:'The photo was not uploaded. Please try again.'},503)}
}
