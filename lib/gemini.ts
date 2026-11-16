import {env} from './env';
import {geminiText} from './ai-plan.mjs';

// One structured-output Gemini call. Small prompts, a JSON schema and an output cap keep tokens predictable.
export async function generateJson(system:string,input:unknown,schema:unknown,maxOutputTokens=4000){
  const model=env.GEMINI_MODEL||'gemini-3.1-flash-lite';
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
    method:'POST',headers:{'x-goog-api-key':env.GEMINI_API_KEY!,'Content-Type':'application/json'},signal:AbortSignal.timeout(45000),
    body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:JSON.stringify(input)}]}],
      generationConfig:{responseMimeType:'application/json',responseJsonSchema:schema,maxOutputTokens,temperature:0.4}}),
  });
  if(!response.ok)throw new Error(`AI provider error ${response.status}`);
  return JSON.parse(geminiText(await response.json()));
}
