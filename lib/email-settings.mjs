// The key remains server-side. Portable ciphertext requires the existing AUTH_PEPPER.
const context='1001/email-settings/v1',encode=new TextEncoder(),decode=new TextDecoder();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))),unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function key(env){if(!env.AUTH_PEPPER)throw Error('Encryption secret unavailable');return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',encode.encode(context+'\0'+env.AUTH_PEPPER)),{name:'AES-GCM'},false,['encrypt','decrypt'])}
export async function encryptEmailConfig(value,env){const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encode.encode(context)},await key(env),encode.encode(JSON.stringify(value)));return JSON.stringify({version:1,iv:b64(iv),cipher:b64(cipher)})}
export async function emailEnvironment(env){if(env.EMAIL_API_KEY)return env;const row=await env.DB.prepare("SELECT value FROM system_settings WHERE key='email_credentials'").first();if(!row)return env;try{const v=JSON.parse(row.value);if(v.version!==1)throw Error('Version');const data=JSON.parse(decode.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(v.iv),additionalData:encode.encode(context)},await key(env),unb64(v.cipher))));return {...env,...data}}catch{return {...env,EMAIL_CONFIGURATION_ERROR:true}}}
export async function emailSettingsRequest(request,env,u,path){
 if(path[0]!=='admin'||path[1]!=='email')return null;
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
 if(u?.role!=='admin')return reply({error:'Yalnız admin üçündür.'},403);
 if(request.method==='GET')return reply({configured:!!env.EMAIL_API_KEY&&!!env.EMAIL_FROM,provider:env.EMAIL_PROVIDER||'brevo',sender:env.EMAIL_FROM||'',name:env.EMAIL_FROM_NAME||'1001 Xırdavat',error:!!env.EMAIL_CONFIGURATION_ERROR});
 if(request.method!=='PUT')return reply({error:'Əməliyyat dəstəklənmir.'},405);
 const raw=await request.text();if(raw.length>5000)return reply({error:'Sorğu çox böyükdür.'},413);let b;try{b=JSON.parse(raw)}catch{return reply({error:'Format düzgün deyil.'},400)}
 const from=String(b.sender||'').trim(),name=String(b.name||'1001 Xırdavat').trim(),apiKey=String(b.apiKey||'').trim();
 if(!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from)||from.length>254||name.length>100||apiKey.length<20||apiKey.length>1000||/[\r\n]/.test(apiKey))return reply({error:'Göndərən emaili və API açarını yoxla.'},400);
 try{
  const headers={'api-key':apiKey,accept:'application/json'},r=await fetch('https://api.brevo.com/v3/senders',{headers,signal:AbortSignal.timeout(10000)});if(!r.ok)return reply({error:'Brevo açarı qəbul edilmədi. Hesab icazələrini yoxla.'},400);
  const data=await r.json();if(!data.senders?.some(s=>s.email?.toLowerCase()===from.toLowerCase()&&s.active===true))return reply({error:'Bu email Brevo-da aktiv göndərən kimi təsdiqlənməyib. Senders bölməsində təsdiqlə.'},400);
  const value=await encryptEmailConfig({EMAIL_PROVIDER:'brevo',EMAIL_FROM:from,EMAIL_FROM_NAME:name,EMAIL_API_KEY:apiKey},env),time=new Date().toISOString();
  await env.DB.batch([env.DB.prepare("INSERT INTO system_settings(key,value,updated_at) VALUES ('email_credentials',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(value,time),env.DB.prepare('INSERT INTO audit (id,actor,action,target,details,created_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),u.id,'email.configure','brevo','{}',time)]);
  return reply({ok:true,message:'Brevo açarı və göndərən yoxlanıldı. Göndəriş xidmət hesabının limit və təsdiqindən asılıdır.'});
 }catch{return reply({error:'Xidmətlə əlaqə və ya qorunan saxlama tamamlanmadı. Yenidən yoxla.'},502)}
}
