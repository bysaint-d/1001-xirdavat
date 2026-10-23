export const capabilities=['catalog','orders','store','moderate'];
export function bootstrapAdmin(email,env){return String(env.ADMIN_EMAILS||'').toLowerCase().split(',').map(v=>v.trim()).includes(String(email).toLowerCase())}
export async function canStore(db,user,storeId,capability){
 if(!user)return false;if(user.role==='admin')return true;
 const store=await db.prepare('SELECT owner FROM stores WHERE id=?').bind(storeId).first();
 if(store?.owner===user.id)return true;
 return !!await db.prepare('SELECT user_id FROM store_permissions WHERE user_id=? AND store_id=? AND capability=?').bind(user.id,storeId,capability).first();
}
export async function scopes(db,user){if(!user)return [];return (await db.prepare('SELECT store_id,capability FROM store_permissions WHERE user_id=?').bind(user.id).all()).results}
export const publicStore=s=>{const d=JSON.parse(s.details||'{}');return {id:s.id,slug:s.slug,name:s.name,category:s.category,tag:s.description,status:s.status,symbol:'✳',details:{phone:d.phone||'',logo:d.logo||'',cover:d.cover||'',hours:d.hours||'',delivery:d.delivery||'',social:d.social||'',shippingFee:d.shippingFee??300}}};
