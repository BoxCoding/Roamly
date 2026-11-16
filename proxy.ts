import {NextResponse,type NextRequest} from 'next/server';
import {createLimiter} from './lib/rate-limit.mjs';

// Rate limits for every write to the API, per client IP: a general cap, a tighter one for sign-in/sign-up,
// and one for photo uploads. Per-account daily caps (posts, comments, uploads, AI) live in the routes.
const writes=createLimiter({limit:60,windowMs:60_000});
const auth=createLimiter({limit:10,windowMs:60_000});
const photos=createLimiter({limit:12,windowMs:60_000});

// Off in local development, where the test suites send bursts of writes from one address.
const enabled=process.env.NODE_ENV==='production'||process.env.RATE_LIMIT==='on';

export function proxy(request:NextRequest){
  if(!enabled||['GET','HEAD','OPTIONS'].includes(request.method))return NextResponse.next();
  // Cloud Run puts the client address first in X-Forwarded-For.
  const ip=request.headers.get('x-forwarded-for')?.split(',')[0].trim()||'local';
  const path=request.nextUrl.pathname;
  const checks=[writes(ip),...(path.startsWith('/api/auth/')?[auth(ip)]:[]),...(path==='/api/uploads'?[photos(ip)]:[])];
  const blocked=checks.find(c=>!c.ok);
  if(blocked)return NextResponse.json({error:'Too many requests. Please wait a minute and try again.'},{status:429,headers:{'Retry-After':String(blocked.retryAfter),'Cache-Control':'no-store'}});
  return NextResponse.next();
}
export const config={matcher:'/api/:path*'};
