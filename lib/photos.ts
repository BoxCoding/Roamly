import {mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {Storage} from '@google-cloud/storage';
import {env} from './env';

// Photos are re-encoded server-side: resized to fit 1600 px, saved as WebP, and every bit of metadata
// (EXIF GPS location, camera serials) is dropped because sharp writes none unless asked.
export const MAX_UPLOAD_BYTES=8*1024*1024,UPLOADS_PER_DAY=30,MAX_PHOTOS=4;
export const KEY=/^[a-f0-9]{32}\.webp$/;
const ACCEPTED=['jpeg','png','webp'];

export async function processImage(input:Buffer){
  const image=sharp(input,{limitInputPixels:40_000_000,failOn:'error'});
  const meta=await image.metadata();
  if(!meta.format||!ACCEPTED.includes(meta.format))throw new Error('Upload a JPEG, PNG or WebP photo.');
  const {data,info}=await image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:80}).toBuffer({resolveWithObject:true});
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
export async function readPhoto(key:string){
  const b=bucket();
  return b?(await b.file(key).download())[0]:readFile(path.join(localDir,key));
}
export async function deletePhotos(keys:string[]){
  const b=bucket();
  await Promise.allSettled(keys.filter(k=>KEY.test(k)).map(k=>b?b.file(k).delete({ignoreNotFound:true}):rm(path.join(localDir,k),{force:true})));
}
