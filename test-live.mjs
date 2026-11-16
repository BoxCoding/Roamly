// Shared helpers for tests that run against the local dev server only.
export function liveOrigin(){
  const origin=process.argv[2]||'http://localhost:5173';
  if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('Run only against the local development server.');
  return origin;
}
// Signs in (registering first if needed) and returns the session cookie.
export async function account(origin,{email=`test-${crypto.randomUUID()}@example.test`,name='Tester',password='road-trip-123'}={}){
  const post=(path,body)=>fetch(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
  let r=await post('/api/auth/register',{name,email,password});
  if(r.status===409)r=await post('/api/auth/login',{email,password});
  if(!r.ok)throw new Error(`Could not sign in ${email}: ${r.status} ${await r.text()}`);
  return r.headers.get('set-cookie').split(';')[0];
}
