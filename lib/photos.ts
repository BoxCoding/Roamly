import {mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {Storage} from '@google-cloud/storage';
import {env} from './env';

// Photos are re-encoded server-side: resized to fit 1600 px, saved as WebP, and every bit of metadata
// (EXIF GPS location, camera serials) is dropped because sharp writes none unless asked.
// 20 MB: phones that cannot shrink a 50 MP photo send the original, and the server shrinks it.
export const MAX_UPLOAD_BYTES=20*1024*1024,UPLOADS_PER_DAY=30,MAX_PHOTOS=4;
export const KEY=/^[a-f0-9]{32}\.webp$/;
const ACCEPTED=['jpeg','png','webp'];

export async function processImage(input:Buffer,max=1600){
  const image=sharp(input,{limitInputPixels:120_000_000,failOn:'error'});
  const meta=await image.metadata();
  if(!meta.format||!ACCEPTED.includes(meta.format))throw new Error('Upload a JPEG, PNG or WebP photo.');
  const {data,info}=await image.rotate().resize({width:max,height:max,fit:'inside',withoutEnlargement:true}).webp({quality:80}).toBuffer({resolveWithObject:true});
  return {data,width:info.width,height:info.height};
}

// Cloud Storage when PHOTO_BUCKET is set (production); a local folder otherwise (development).
// shortcut: the local folder is for dev only; it is not shared between instances.
let storage:Storage|undefined;
const bucket=()=>env.PHOTO_BUCKET?(storage??=new Storage()).bucket(env.PHOTO_BUCKET):null;
const localDir=path.join(process.cwd(),'.uploads');
export async function savePhoto(key:string,data:Buffer){
  const b=bucket();
  if(b)return void await b.file(key).save(data,{contentType:'image/webp',resumable:false,metadata:{cacheControl:'public, max-age=31536000, immutable'}});
  await mkdir(localDir,{recursive:true});await writeFile(path.join(localDir,key),data);
}
// Photos never change once stored, so each instance keeps recent ones in memory: a bucket read takes
// 0.5-4 s, which made a phone loading 16 route covers wait. Oldest entries go first past ~64 MB.
const memory=new Map<string,Buffer>();let memoryBytes=0;
export async function readPhoto(key:string){
  const hit=memory.get(key);
  if(hit){memory.delete(key);memory.set(key,hit);return hit}
  const b=bucket(),data=b?(await b.file(key).download())[0]:await readFile(path.join(localDir,key));
  memory.set(key,data);memoryBytes+=data.length;
  for(const [k,v] of memory){if(memoryBytes<=64*1024*1024)break;memory.delete(k);memoryBytes-=v.length}
  return data;
}
export async function deletePhotos(keys:string[]){
  const b=bucket();
  for(const k of keys){const v=memory.get(k);if(v){memory.delete(k);memoryBytes-=v.length}}
  await Promise.allSettled(keys.filter(k=>KEY.test(k)).map(k=>b?b.file(k).delete({ignoreNotFound:true}):rm(path.join(localDir,k),{force:true})));
}

// Wikimedia hotlinks are slow when a phone asks for many at once (~12 s each in parallel), so chosen
// route covers are copied once into our storage as 960 px WebP. The key is derived from the source URL,
// so copying the same photo twice reuses one file.
export const WIKIMEDIA=/^https:\/\/(upload|thumb)\.wikimedia\.org\//;
export async function copyRemoteCover(url:string){
  if(!WIKIMEDIA.test(url))return url;
  const r=await fetch(url,{headers:{'User-Agent':'Roamly/1.0 (rider community app)'},signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw new Error('cover download '+r.status);
  const raw=Buffer.from(await r.arrayBuffer());
  if(raw.length>MAX_UPLOAD_BYTES*2)throw new Error('cover too large');
  const {data}=await processImage(raw,960);
  const key=createHash('md5').update(url).digest('hex')+'.webp';
  await savePhoto(key,data);
  return '/api/photos/'+key;
}
