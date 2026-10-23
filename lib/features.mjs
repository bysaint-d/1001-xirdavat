import {canStore,capabilities,scopes,bootstrapAdmin,publicStore} from './access.mjs';
import {emailSettingsRequest} from './email-settings.mjs';
import {businessRequest} from './business.mjs';
import {notify,flushEmail,emailConfig} from './notifications.mjs';
const q=(d,s,...v)=>d.prepare(s).bind(...v),one=(d,s,...v)=>q(d,s,...v).first(),all=async(d,s,...v)=>(await q(d,s,...v).all()).results;
const time=()=>new Date().toISOString(),id=()=>crypto.randomUUID(),json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export class FeatureError extends Error{constructor(status,message){super(message);this.status=status}}
const fail=(s,m)=>{throw new FeatureError(s,m)},text=(v,min=0,max=300)=>{if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)fail(400,'Məlumatın uzunluğu düzgün deyil.');return v.trim()};
async function body(r){const s=await r.text();if(s.length>512000)fail(413,'Sorğu çox böyükdür.');try{return JSON.parse(s||'{}')}catch{fail(400,'JSON formatı düzgün deyil.')}}
const audit=(d,u,action,target,detail={})=>q(d,'INSERT INTO audit (id,actor,action,target,details,created_at) VALUES (?,?,?,?,?,?)',id(),u.id,action,target,JSON.stringify(detail),time());
async function requireStore(d,u,s,c){if(!await canStore(d,u,s,c))fail(403,'Bu mağaza üçün səlahiyyət yoxdur.')}
export async function featureRequest(request,env,u,path){const emailSettings=await emailSettingsRequest(request,env,u,path);if(emailSettings)return emailSettings;const extra=await businessRequest(request,env,u,path);if(extra)return extra;const d=env.DB,m=request.method,url=new URL(request.url),p=path[0];
 if(p==='product-info'&&m==='GET'){
  const product=await one(d,"SELECT p.id FROM products p JOIN stores s ON s.id=p.store WHERE p.id=? AND p.status='active' AND s.status='approved'",path[1]);if(!product)fail(404,'Məhsul tapılmadı.');
  return json({reviews:await all(d,"SELECT r.id,r.rating,r.body,r.created_at,u.name FROM product_reviews r JOIN users u ON u.id=r.user_id WHERE r.product_id=? AND r.status='published' ORDER BY r.created_at DESC LIMIT 100",product.id),questions:await all(d,"SELECT q.id,q.question,q.answer,q.created_at,u.name FROM product_questions q JOIN users u ON u.id=q.user_id WHERE q.product_id=? AND q.status='published' ORDER BY q.created_at DESC LIMIT 100",product.id)});
 }
 if(!u)return null;
 if(p==='profile'){
  if(m==='GET')return json({user:await one(d,'SELECT id,email,name,phone,account_type,role,email_verified FROM users WHERE id=?',u.id),addresses:await all(d,'SELECT * FROM addresses WHERE user_id=? ORDER BY created_at DESC',u.id)});
  if(m==='PATCH'){const b=await body(request);await d.batch([q(d,'UPDATE users SET name=?,phone=? WHERE id=?',text(b.name,2,100),text(b.phone||'',0,30),u.id),audit(d,u,'profile.edit',u.id)]);return json({ok:true})}
 }
 if(p==='addresses'){
  if(m==='POST'){const b=await body(request);if((await one(d,'SELECT COUNT(*) n FROM addresses WHERE user_id=?',u.id)).n>=10)fail(400,'Maksimum 10 ünvan saxlanıla bilər.');const key=id();await q(d,'INSERT INTO addresses (id,user_id,label,name,phone,city,address,created_at) VALUES (?,?,?,?,?,?,?,?)',key,u.id,text(b.label||'Ev',1,50),text(b.name,2,100),text(b.phone,3,30),text(b.city,2,50),text(b.address,2,300),time()).run();return json({id:key},201)}
  if(m==='DELETE'){await q(d,'DELETE FROM addresses WHERE id=? AND user_id=?',path[1],u.id).run();return json({ok:true})}
 }
 if(p==='notifications'){
  if(m==='GET')return json(await all(d,'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100',u.id));
  if(m==='PATCH'){await q(d,'UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL',time(),u.id).run();return json({ok:true})}
 }
 if(p==='reviews'&&m==='POST'){
  const b=await body(request),product=text(b.product,1,100);if(!Number.isInteger(b.rating)||b.rating<1||b.rating>5)fail(400,'1–5 ulduz seçin.');
  if(!await one(d,"SELECT l.id FROM order_lines l JOIN suborders s ON s.id=l.suborder JOIN orders o ON o.id=s.order_id WHERE o.buyer=? AND l.product=? AND s.status='delivered'",u.id,product))fail(403,'Yalnız çatdırılmış məhsula rəy yaza bilərsən.');
  await q(d,'INSERT INTO product_reviews (id,product_id,user_id,rating,body,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(product_id,user_id) DO UPDATE SET rating=excluded.rating,body=excluded.body,status=\'published\'',id(),product,u.id,b.rating,text(b.body,5,1000),time()).run();return json({ok:true},201);
 }
 if(p==='questions'){
  if(m==='POST'){const b=await body(request),product=await one(d,"SELECT p.id,p.store,s.owner FROM products p JOIN stores s ON s.id=p.store WHERE p.id=? AND p.status='active' AND s.status='approved'",b.product);if(!product)fail(404,'Məhsul tapılmadı.');await q(d,'INSERT INTO product_questions (id,product_id,user_id,question,created_at) VALUES (?,?,?,?,?)',id(),product.id,u.id,text(b.question,5,1000),time()).run();await notify(d,product.owner,'Məhsuluna sual gəldi',text(b.question,5,1000),'/product/'+product.id);return json({ok:true},201)}
  if(m==='PATCH'){const question=await one(d,'SELECT q.*,p.store FROM product_questions q JOIN products p ON p.id=q.product_id WHERE q.id=?',path[1]);if(!question)fail(404,'Sual tapılmadı.');await requireStore(d,u,question.store,'catalog');const b=await body(request);await q(d,'UPDATE product_questions SET answer=?,answered_by=? WHERE id=?',text(b.answer,2,1500),u.id,question.id).run();await notify(d,question.user_id,'Sualına cavab gəldi','Məhsul səhifəsində cavaba bax.','/product/'+question.product_id);return json({ok:true})}
 }
 if(p==='reports'&&m==='POST'){const b=await body(request),product=b.product?await one(d,'SELECT id,store FROM products WHERE id=?',b.product):null,store=b.store||product?.store;if(!store||!await one(d,'SELECT id FROM stores WHERE id=?',store))fail(404,'Mağaza tapılmadı.');await q(d,'INSERT INTO reports (id,user_id,store_id,product_id,reason,created_at) VALUES (?,?,?,?,?,?)',id(),u.id,store,product?.id||null,text(b.reason,10,1500),time()).run();return json({ok:true},201)}
 if(p==='seller-tools'&&m==='GET'){
  const stores=await all(d,'SELECT * FROM stores WHERE owner=? OR id IN (SELECT store_id FROM store_permissions WHERE user_id=?)',u.id,u.id),ids=stores.map(s=>s.id),products=ids.length?await all(d,'SELECT * FROM products WHERE store IN ('+ids.map(()=>'?').join(',')+')',...ids):[];
  return json({stores:stores.map(s=>({...publicStore(s),owner:s.owner})),products:products.map(p=>({...JSON.parse(p.payload),...p,price:p.price/100})),lowStock:products.filter(p=>p.stock<=(JSON.parse(p.payload).lowStockThreshold??3)).map(p=>({id:p.id,sku:p.sku,name:p.name,stock:p.stock})),scopes:await scopes(d,u)});
 }
 if(p==='products'&&path[1]==='bulk'&&m==='POST'){
  const b=await body(request),store=await one(d,'SELECT * FROM stores WHERE id=?',b.store);if(!store)fail(404,'Mağaza tapılmadı.');await requireStore(d,u,store.id,'catalog');if(store.status==='suspended')fail(403,'Mağaza dayandırılıb.');
  if(!Array.isArray(b.rows)||!b.rows.length||b.rows.length>100)fail(400,'Bir dəfə 1–100 sətir göndərilə bilər.');const batch=[],seen=new Set();
  for(const row of b.rows){const sku=text(row.sku,2,40);if(!/^[A-Za-z0-9_-]+$/.test(sku)||seen.has(sku.toLowerCase()))fail(400,'SKU təkrarlanır və ya düzgün deyil.');seen.add(sku.toLowerCase());const old=await one(d,'SELECT * FROM products WHERE lower(sku)=?',sku.toLowerCase());if(old&&old.store!==store.id)fail(409,'SKU başqa mağazaya aiddir.');const price=Math.round(Number(row.price)*100),stock=Number(row.stock);if(!Number.isSafeInteger(price)||price<1||price>100000000||!Number.isSafeInteger(stock)||stock<0||stock>100000)fail(400,sku+': qiymət və ya stok düzgün deyil.');
   if(old&&b.mode==='stock')batch.push(q(d,'UPDATE products SET price=?,stock=? WHERE id=?',price,stock,old.id));
   else{const cat=text(row.category||store.category,1,80);if(!['Ev və dekor','Alətlər','Elektronika','Aksesuarlar','Mətbəx','Hobbi və bağ'].includes(cat))fail(400,'Kateqoriya düzgün deyil.');const payload={...(old?JSON.parse(old.payload):{}),desc:text(row.desc||'',0,1500),brand:text(row.brand||'',0,80),barcode:text(row.barcode||'',0,80),material:text(row.material||'',0,80),size:text(row.size||'',0,80),power:text(row.power||'',0,80),subcategory:text(row.subcategory||'',0,80),marketplace:row.marketplace!==false};const key=old?.id||id(),status=u.role==='admin'?'active':'pending';batch.push(old?q(d,'UPDATE products SET name=?,category=?,price=?,stock=?,payload=?,status=? WHERE id=?',text(row.name,2,120),cat,price,stock,JSON.stringify(payload),status,key):q(d,'INSERT INTO products (id,store,sku,name,category,price,stock,status,payload,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',key,store.id,sku,text(row.name,2,120),cat,price,stock,status,JSON.stringify(payload),time()))}
  }batch.push(audit(d,u,'products.bulk',store.id,{count:b.rows.length,mode:b.mode||'import'}));await d.batch(batch);return json({ok:true,count:b.rows.length});
 }
 if(p!=='admin')return null;
 if(!['admin','moderator'].includes(u.role))fail(403,'İdarəetmə səlahiyyəti yoxdur.');
 const admin=()=>{if(u.role!=='admin')fail(403,'Yalnız admin üçündür.')};
 if(m==='GET'&&!path[1]){
  const stores=await all(d,u.role==='admin'?'SELECT * FROM stores ORDER BY created_at DESC':'SELECT * FROM stores WHERE id IN (SELECT store_id FROM store_permissions WHERE user_id=?) ORDER BY created_at DESC',...(u.role==='admin'?[]:[u.id]));const ids=stores.map(s=>s.id),products=ids.length?await all(d,'SELECT * FROM products WHERE store IN ('+ids.map(()=>'?').join(',')+') ORDER BY created_at DESC',...ids):[];
  return json({users:u.role==='admin'?await all(d,'SELECT id,email,name,role,account_type,active,email_verified,created_at FROM users ORDER BY created_at DESC LIMIT 1000'):[],stores:stores.map(s=>({...publicStore(s),owner:s.owner})),products:products.map(p=>({...JSON.parse(p.payload),...p,price:p.price/100})),permissions:u.role==='admin'?await all(d,'SELECT * FROM store_permissions'):await scopes(d,u),tickets:u.role==='admin'?await all(d,'SELECT * FROM tickets ORDER BY created_at DESC LIMIT 200'):[],audit:u.role==='admin'?await all(d,'SELECT * FROM audit ORDER BY created_at DESC LIMIT 200'):[],documents:u.role==='admin'?await all(d,"SELECT id,owner,mime,created_at FROM assets WHERE kind='document'"):[],reviews:u.role==='admin'?await all(d,'SELECT * FROM product_reviews ORDER BY created_at DESC LIMIT 200'):[],reports:u.role==='admin'?await all(d,'SELECT * FROM reports ORDER BY created_at DESC LIMIT 200'):[],outbox:u.role==='admin'?await all(d,'SELECT id,recipient,subject,status,attempts,last_error,created_at FROM delivery_outbox ORDER BY created_at DESC LIMIT 100'):[],integrations:{email:emailConfig(env).configured,shipping:false,payment:'test'},scope:await scopes(d,u)});
 }
 if(path[1]==='permissions'&&m==='PUT'){
  admin();const b=await body(request),target=await one(d,'SELECT * FROM users WHERE id=?',b.user);if(!target||bootstrapAdmin(target.email,env))fail(400,'Bu hesabın səlahiyyəti dəyişdirilə bilməz.');if(!await one(d,'SELECT id FROM stores WHERE id=?',b.store)||!Array.isArray(b.capabilities)||b.capabilities.some(c=>!capabilities.includes(c)))fail(400,'Mağaza və ya hüquqlar düzgün deyil.');
  const batch=[q(d,'DELETE FROM store_permissions WHERE user_id=? AND store_id=?',target.id,b.store),...new Set(b.capabilities)].map((v,i)=>i===0?v:q(d,'INSERT INTO store_permissions (user_id,store_id,capability,granted_by,created_at) VALUES (?,?,?,?,?)',target.id,b.store,v,u.id,time()));
  if(b.capabilities.length)batch.push(q(d,"UPDATE users SET role='moderator' WHERE id=?",target.id));batch.push(q(d,'DELETE FROM auth_sessions WHERE user_id=? AND audience=\'admin\'',target.id),audit(d,u,'permissions.set',target.id,{store:b.store,capabilities:b.capabilities}));await d.batch(batch);return json({ok:true});
 }
 if(path[1]==='users'&&m==='PATCH'){
  admin();const target=await one(d,'SELECT * FROM users WHERE id=?',path[2]);if(!target)fail(404,'İstifadəçi tapılmadı.');if(target.id===u.id||bootstrapAdmin(target.email,env))fail(400,'Əsas admin hesabı qorunur.');const b=await body(request);if(b.role&&!['buyer','seller','moderator'].includes(b.role))fail(400,'Rol düzgün deyil.');const batch=[];if(b.active!==undefined)batch.push(q(d,'UPDATE users SET active=? WHERE id=?',b.active?1:0,target.id));if(b.role){batch.push(q(d,'UPDATE users SET role=? WHERE id=?',b.role,target.id));if(b.role!=='moderator')batch.push(q(d,'DELETE FROM store_permissions WHERE user_id=?',target.id))}batch.push(q(d,'DELETE FROM auth_sessions WHERE user_id=?',target.id),audit(d,u,'user.update',target.id,{role:b.role,active:b.active}));await d.batch(batch);return json({ok:true});
 }
 if(path[1]==='stores'&&m==='PATCH'){
  await requireStore(d,u,path[2],'store');const store=await one(d,'SELECT * FROM stores WHERE id=?',path[2]);if(!store)fail(404,'Mağaza tapılmadı.');const b=await body(request),batch=[];
  if(b.status!==undefined){admin();if(!['approved','pending','suspended'].includes(b.status))fail(400,'Status düzgün deyil.');batch.push(q(d,'UPDATE stores SET status=? WHERE id=?',b.status,store.id))}
  if(b.owner!==undefined){admin();const target=await one(d,"SELECT id FROM users WHERE id=? AND active=1 AND account_type IN ('seller','staff')",b.owner);if(!target)fail(400,'Aktiv satıcı hesabı seçin.');batch.push(q(d,'UPDATE stores SET owner=? WHERE id=?',target.id,store.id))}
  if(b.name!==undefined)batch.push(q(d,'UPDATE stores SET name=?,description=? WHERE id=?',text(b.name,2,80),text(b.tag||store.description,0,300),store.id));batch.push(audit(d,u,'admin.store_edit',store.id,{status:b.status,owner:b.owner}));await d.batch(batch);return json({ok:true});
 }
 if(path[1]==='products'&&m==='PATCH'&&Object.hasOwn(await request.clone().json(),'status')){
  const product=await one(d,'SELECT * FROM products WHERE id=?',path[2]);if(!product)fail(404,'Məhsul yoxdur.');await requireStore(d,u,product.store,'moderate');const b=await body(request);if(!['pending','active','archived'].includes(b.status))fail(400,'Status düzgün deyil.');await d.batch([q(d,'UPDATE products SET status=? WHERE id=?',b.status,product.id),audit(d,u,'product.moderate',product.id,{status:b.status})]);return json({ok:true});
 }
 if(path[1]==='reports'&&m==='PATCH'){admin();const b=await body(request);if(!['open','resolved','dismissed'].includes(b.status))fail(400,'Status düzgün deyil.');await d.batch([q(d,'UPDATE reports SET status=?,resolution=? WHERE id=?',b.status,text(b.resolution||'',0,1500),path[2]),audit(d,u,'report.resolve',path[2])]);return json({ok:true})}
 if(path[1]==='reviews'&&m==='PATCH'){admin();const b=await body(request);if(!['published','hidden'].includes(b.status))fail(400,'Status düzgün deyil.');await d.batch([q(d,'UPDATE product_reviews SET status=? WHERE id=?',b.status,path[2]),audit(d,u,'review.moderate',path[2])]);return json({ok:true})}
 if(path[1]==='outbox'&&m==='POST'){admin();return json(await flushEmail(env,{force:true}))}
 if(path[1]==='health'&&m==='GET'){admin();const violations=await all(d,'PRAGMA foreign_key_check');return json({ok:violations.length===0,foreignKeyViolations:violations.length,pendingEmail:(await one(d,"SELECT COUNT(*) n FROM delivery_outbox WHERE status='pending'")).n,tables:(await all(d,"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'")).map(v=>v.name),integrations:{email:emailConfig(env).configured,shipping:false}})}
 if(path[1]==='orders'&&m==='GET')return null;if(u.role!=='admin')fail(403,'Bu əməliyyat yalnız admin üçündür.');return null;
}
