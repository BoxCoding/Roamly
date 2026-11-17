import {and,eq} from 'drizzle-orm';
import {getDb} from '../db';
import {uploads} from '../db/schema';
import {env} from './env';
import {generateJson} from './gemini';

type Cover = {url: string, credit: string, page: string} | null;

// An uploaded cover must be the rider's own upload, unless it is the cover the ride already has (a co-lead editing).
export async function coverAllowed(cover: Cover, userId: string, current: string | null = null) {
  const key = cover?.url.match(/^\/api\/photos\/([a-f0-9]{32}\.webp)$/)?.[1];
  if (!key || (current && JSON.parse(current).url === cover!.url)) return true;
  const [own] = await getDb().select({key: uploads.key}).from(uploads).where(and(eq(uploads.key, key), eq(uploads.userId, userId))).limit(1);
  return Boolean(own);
}

const strip = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const TAGS_SCHEMA = {type: 'object', properties: {tags: {type: 'array', items: {type: 'string'}}, query: {type: 'string'}}, required: ['tags', 'query']};

// One small AI call (about 200 tokens) for tags and a photo search phrase, then a free Wikimedia Commons image search.
// Without an AI key, or if the call fails, it falls back to the route text as the search and no tags.
export async function suggestRideMedia(ride: {title: string, route: string, description: string, vehicle: string}) {
  let tags: string[] = [], query = ride.route;
  if (env.GEMINI_API_KEY) {
    try {
      const out = await generateJson('You tag Indian group motorcycle and car rides. Return up to 5 short tags (1-3 words, Title Case) a rider would filter by: terrain, scenery, season, difficulty, ride type. Return query: 2-5 English words naming the most photogenic real place or landscape on this route, for a photo search. No people, no brands.', ride, TAGS_SCHEMA, 200);
      tags = [...new Set((out.tags || []).map((t: unknown) => String(t).trim().slice(0, 24)).filter(Boolean))].slice(0, 5) as string[];
      if (typeof out.query === 'string' && out.query.trim()) query = out.query.trim().slice(0, 80);
    } catch {}
  }
  // Commons search matches every word, so fall back to shorter phrases and then the route's places.
  const places = ride.route.split(/→|·|,|->/).map(x => x.trim()).filter(Boolean);
  const tries = [...new Set([query, query.split(/\s+/).slice(0, 2).join(' '), ...places.reverse()].filter(Boolean))].slice(0, 4);
  let images: {url: string, credit: string, page: string}[] = [];
  for (const q of tries) {
    images = await commonsImages(q);
    if (images.length >= 3) break;
  }
  return {tags, query, images};
}

async function commonsImages(query: string) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrsearch: `${query} filetype:bitmap`, gsrlimit: '12', prop: 'imageinfo', iiprop: 'url|extmetadata|mime', iiurlwidth: '1280', iiextmetadatafilter: 'Artist|LicenseShortName'}).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const r = await fetch(url, {headers: {'User-Agent': 'Roamly/1.0 (rider community app)'}, signal: AbortSignal.timeout(6000)});
    const pages = Object.values(((await r.json()).query?.pages || {}) as Record<string, {title: string, imageinfo?: {thumburl?: string, descriptionurl?: string, mime?: string, extmetadata?: Record<string, {value: string}>}[]}>);
    return pages.flatMap(p => {
      const i = p.imageinfo?.[0];
      if (!i?.thumburl || !/^image\/(jpeg|png)$/.test(i.mime || '')) return [];
      const artist = strip(i.extmetadata?.Artist?.value || '').slice(0, 80), license = strip(i.extmetadata?.LicenseShortName?.value || '');
      return [{url: i.thumburl.split("?")[0], credit: [artist && `Photo: ${artist}`, license, 'Wikimedia Commons'].filter(Boolean).join(' · ').slice(0, 200), page: i.descriptionurl || ''}];
    }).slice(0, 6);
  } catch { return []; }
}
