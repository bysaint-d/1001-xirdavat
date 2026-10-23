import {canStore} from './access.mjs';
const q=(d,s,...v)=>d.prepare(s).bind(...v),all=async(d,s,...v)=>(await q(d,s,...v).all()).results;
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
class InputError extends Error{constructor(status,message){super(message);this.status=status}}
const fail=(s,m)=>{throw new InputError(s,m)},text=(v,min=0,max=300)=>{if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)fail(400,'Məlumatın uzunluğunu yoxla.');return v.trim()};
async function body(r){const raw=await r.text();if(raw.length>16000)fail(413,'Müraciət çox böyükdür.');try{return JSON.parse(raw)}catch{fail(400,'JSON formatını yoxla.')}}
export const defaults={name:'1001 Xırdavat',phone:'+994503477306',email:'',address:'',taxId:'',legalName:'',hours:''};
export async function business(db){const r=await q(db,"SELECT value FROM system_settings WHERE key='business'").first();return {...defaults,...(r?JSON.parse(r.value):{})}}
export const carrierNames={manual:'Satıcının kuryeri / digər',ncm:'NCM Çapar',qapida:'Qapıda'};
export function trackingUrl(carrier,code){return carrier==='ncm'&&code?'https://ncmcapar.az/az/tracking?number='+encodeURIComponent(code):carrier==='qapida'?'https://qapida.az/':''}
const csvCell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
export async function businessRequest(request,env,u,path){try{
 const db=env.DB,m=request.method,p=path[0];
 if(p==='business'&&m==='GET')return json(await business(db));
 if(p==='contact'&&m==='POST'){
  const b=await body(request);if(b.website)return json({ok:true},201);
  const ip=request.headers.get('cf-connecting-ip')||'local',digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip)))].map(v=>v.toString(16).padStart(2,'0')).join('');
  const key='contact:'+digest+':'+Math.floor(Date.now()/3600000),hit=await q(db,'INSERT INTO rate_limits (id,hits,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET hits=hits+1 RETURNING hits',key,Date.now()+7200000).first();if(hit.hits>5)fail(429,'Müraciət limitinə çatdın. Bir saat sonra yenidən yoxla və ya zəng et.');await q(db,'DELETE FROM rate_limits WHERE expires<?',Date.now()).run();
  const email=text(b.email||'',0,254),phone=text(b.phone||'',0,30);if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Email düzgün deyil.');if(!email&&phone.replace(/\D/g,'').length<7)fail(400,'Cavab üçün email və ya telefon yaz.');if(b.consent!==true)fail(400,'Məxfilik şərtləri ilə tanış ol.');
  const id=crypto.randomUUID();await q(db,'INSERT INTO contact_messages (id,name,email,phone,subject,message,created_at) VALUES (?,?,?,?,?,?,?)',id,text(b.name,2,100),email,phone,text(b.subject,2,120),text(b.message,10,3000),new Date().toISOString()).run();return json({ok:true,id},201);
 }
 if(p==='shipping'&&path[1]==='export'&&m==='GET'){
  if(!u)fail(401,'Daxil olun.');const store=new URL(request.url).searchParams.get('store');if(!store||!await canStore(db,u,store,'orders'))fail(403,'Mağaza üçün sifariş hüququ yoxdur.');
  const rows=await all(db,"SELECT s.id,s.status,s.tracking,s.carrier,o.contact,o.delivery,o.payment FROM suborders s JOIN orders o ON o.id=s.order_id WHERE s.store=? AND s.status IN ('confirmed','preparing','shipped') ORDER BY s.updated_at",store);
  const lines=[['shipment_reference','recipient','phone','city','address','delivery','carrier','tracking','payment_mode'],...rows.map(r=>{const c=JSON.parse(r.contact);return [r.id,c.name,c.phone,c.city,c.address,r.delivery,r.carrier,r.tracking,r.payment]})];
  return new Response('\uFEFF'+lines.map(row=>row.map(csvCell).join(',')).join('\r\n'),{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="shipping.csv"','cache-control':'no-store','x-content-type-options':'nosniff'}});
 }
 if(p!=='admin'||!['business','contacts'].includes(path[1]))return null;
 if(u?.role!=='admin')fail(403,'Yalnız admin üçündür.');
 if(path[1]==='business'){
  if(m==='GET')return json(await business(db));
  if(m==='PUT'){const b=await body(request),value={name:text(b.name,2,80),phone:text(b.phone,7,30),email:text(b.email||'',0,254),address:text(b.address||'',0,300),taxId:text(b.taxId||'',0,10),legalName:text(b.legalName||'',0,150),hours:text(b.hours||'',0,150)};if(value.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))fail(400,'Email düzgün deyil.');if(value.taxId&&!/^\d{10}$/.test(value.taxId))fail(400,'VÖEN 10 rəqəm olmalıdır.');const time=new Date().toISOString();await db.batch([q(db,"INSERT INTO system_settings(key,value,updated_at) VALUES ('business',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",JSON.stringify(value),time),q(db,'INSERT INTO audit (id,actor,action,target,details,created_at) VALUES (?,?,?,?,?,?)',crypto.randomUUID(),u.id,'business.update','business','{}',time)]);return json({ok:true})}
 }
 if(path[1]==='contacts'&&m==='GET')return json(await all(db,'SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200'));
 if(path[1]==='contacts'&&m==='PATCH'){const b=await body(request);if(!['open','closed'].includes(b.status))fail(400,'Status düzgün deyil.');await q(db,'UPDATE contact_messages SET status=? WHERE id=?',b.status,path[2]).run();return json({ok:true})}
 return null;
 }catch(e){if(e instanceof InputError)return json({error:e.message},e.status);throw e}}
