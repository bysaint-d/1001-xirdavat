const q=(db,sql,...values)=>db.prepare(sql).bind(...values);
export function notificationStatements(db,user,title,body,link='/',email){
 const created=new Date().toISOString(),list=[q(db,'INSERT INTO notifications (id,user_id,title,body,link,created_at) VALUES (?,?,?,?,?,?)',crypto.randomUUID(),user,title,body,link,created)];
 if(email)list.push(q(db,'INSERT INTO delivery_outbox (id,user_id,recipient,subject,body,created_at) VALUES (?,?,?,?,?,?)',crypto.randomUUID(),user,email,title,body,created));return list;
}
export async function notify(db,user,title,body,link='/',email){await db.batch(notificationStatements(db,user,title,body,link,email))}
export async function flushEmail(env){
 if(!env.EMAIL_API_KEY||!env.EMAIL_FROM)return {configured:false,sent:0};
 const pending=(await env.DB.prepare("SELECT * FROM delivery_outbox WHERE status='pending' AND channel='email' AND attempts<5 ORDER BY created_at LIMIT 20").all()).results;let sent=0;
 for(const item of pending){
  const claim=await q(env.DB,"UPDATE delivery_outbox SET status='sending',attempts=attempts+1 WHERE id=? AND status='pending'",item.id).run();if(!claim.meta.changes)continue;
  try{const r=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:{authorization:'Bearer '+env.EMAIL_API_KEY,'content-type':'application/json','idempotency-key':item.id},body:JSON.stringify({from:env.EMAIL_FROM,to:[item.recipient],subject:item.subject,text:item.body})});if(!r.ok)throw Error('PROVIDER_'+r.status);await q(env.DB,"UPDATE delivery_outbox SET status='sent',sent_at=?,body='' WHERE id=?",new Date().toISOString(),item.id).run();sent++}catch{await q(env.DB,"UPDATE delivery_outbox SET status='pending',last_error='DELIVERY_FAILED' WHERE id=?",item.id).run()}
 }return {configured:true,sent};
}
