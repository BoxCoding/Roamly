import {KEY,readPhoto} from '../../../../lib/photos';
export const dynamic='force-dynamic';

// Serves stored photos from the private bucket. Keys are random, so URLs cannot be guessed.
export async function GET(_request:Request,{params}:{params:Promise<{key:string}>}){
  const {key}=await params;
  if(!KEY.test(key))return new Response('Not found',{status:404});
  try{
    const data=await readPhoto(key);
    return new Response(new Uint8Array(data),{headers:{'Content-Type':'image/webp','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});
  }catch{return new Response('Not found',{status:404})}
}
