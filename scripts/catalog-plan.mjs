import fs from 'node:fs/promises';
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
export async function catalogPlan(store){
 const products=JSON.parse(await fs.readFile(new URL('../lib/catalog-data.json',import.meta.url),'utf8'));
 if(products.length!==100||new Set(products.map(p=>p.id)).size!==100||new Set(products.map(p=>p.sku.toLowerCase())).size!==100)throw Error('Catalog requires 100 unique items');
 for(const p of products)if(!/^https:\/\/birmarket.az\/product\/\d+-/.test(p.sourceUrl)||!p.name||p.name.length>120||!Number.isFinite(p.price)||p.price<=0)throw Error('Invalid source record');
 // Existing rows, prices, stock and order references remain untouched.
 return products.map(p=>'INSERT OR IGNORE INTO products (id,store,sku,name,category,price,stock,status,payload,created_at) VALUES ('+[p.id,store,p.sku,p.name,p.category].map(quote).join(',')+','+Math.round(p.price*100)+",0,'active',"+quote(JSON.stringify({...p,store,marketplace:true,inventoryVerified:false}))+','+quote(p.sourceDate)+');').join('\n');
}
