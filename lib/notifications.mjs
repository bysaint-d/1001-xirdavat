const q=(db,sql,...values)=>db.prepare(sql).bind(...values);
export function notificationStatements(db,user,title,body,link='/',email){
 const created=new Date().toISOString(),list=[q(db,'INSERT INTO notifications (id,user_id,title,body,link,created_at) VALUES (?,?,?,?,?,?)',crypto.randomUUID(),user,title,body,link,created)];
 if(email)list.push(q(db,'INSERT INTO delivery_outbox (id,user_id,recipient,subject,body,created_at) VALUES (?,?,?,?,?,?)',crypto.randomUUID(),user,email,title,body,created));return list;
}
export async function notify(db,user,title,body,link='/',email){await db.batch(notificationStatements(db,user,title,body,link,email))}
export function emailConfig(env){const provider=env.EMAIL_PROVIDER||'resend',match=String(env.EMAIL_FROM||'').match(/^(?:(.*?)\s*<)?([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)>?$/);return {provider,from:match?.[2]||'',name:env.EMAIL_FROM_NAME||match?.[1]?.trim()||'1001 Xırdavat',configured:!!env.EMAIL_API_KEY&&!!match&&['brevo','resend'].includes(provider)}}
export async function flushEmail(env,{force=false}={}){
 const config=emailConfig(env);if(!config.configured)return {configured:false,sent:0};
 const now=new Date().toISOString(),cutoff=new Date(Date.now()-60000).toISOString();
 const lock=await q(env.DB,"INSERT INTO system_settings(key,value,updated_at) VALUES ('email_dispatch_lock','{}',?) ON CONFLICT(key) DO UPDATE SET updated_at=excluded.updated_at WHERE system_settings.updated_at<? RETURNING key",now,force?new Date(Date.now()+1).toISOString():cutoff).first();if(!lock)return {configured:true,sent:0,busy:true};
 await q(env.DB,"UPDATE delivery_outbox SET status=CASE WHEN attempts>=5 THEN 'failed' ELSE 'pending' END,lease_until=NULL WHERE status='sending' AND lease_until IS NOT NULL AND lease_until<?",now).run();
 const pending=(await q(env.DB,"SELECT * FROM delivery_outbox WHERE status='pending' AND channel='email' AND attempts<5 AND (next_attempt_at IS NULL OR next_attempt_at<=?) ORDER BY CASE WHEN subject IN ('Şifrəni yenilə','Email ünvanını təsdiqlə') THEN 0 ELSE 1 END,created_at LIMIT 10",now).all()).results;let sent=0;
 for(const item of pending){
  const claim=await q(env.DB,"UPDATE delivery_outbox SET status='sending',attempts=attempts+1,lease_until=? WHERE id=? AND status='pending'",new Date(Date.now()+120000).toISOString(),item.id).run();if(!claim.meta.changes)continue;
  try{const brevo=config.provider==='brevo',r=await fetch(brevo?'https://api.brevo.com/v3/smtp/email':'https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:brevo?{'api-key':env.EMAIL_API_KEY,'content-type':'application/json'}:{authorization:'Bearer '+env.EMAIL_API_KEY,'content-type':'application/json','idempotency-key':item.id},body:JSON.stringify(brevo?{sender:{email:config.from,name:config.name},to:[{email:item.recipient}],subject:item.subject,textContent:item.body,headers:{'Idempotency-Key':item.id}}:{from:env.EMAIL_FROM,to:[item.recipient],subject:item.subject,text:item.body})});if(!r.ok)throw Error('PROVIDER_'+r.status);const data=await r.json();await q(env.DB,"UPDATE delivery_outbox SET status='sent',sent_at=?,body='',lease_until=NULL,last_error='',provider_id=? WHERE id=?",new Date().toISOString(),String(data.messageId||data.id||'').slice(0,300),item.id).run();sent++}catch{await q(env.DB,"UPDATE delivery_outbox SET status=?,lease_until=NULL,next_attempt_at=?,last_error='DELIVERY_FAILED' WHERE id=?",item.attempts+1>=5?'failed':'pending',new Date(Date.now()+Math.min(86400000,60000*2**(item.attempts+1))).toISOString(),item.id).run()}
 }return {configured:true,sent};
}
