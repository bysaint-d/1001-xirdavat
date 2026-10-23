// Bounded public facts, never inventory, reviews, descriptions or customer data.
// Plain public category/product pages only; no search/auth/private APIs.
import fs from 'node:fs/promises';
import {products as existing} from '../lib/seed-data.mjs';
const out='.sites-runtime/catalog';await fs.mkdir(out,{recursive:true});
const categories=[['2627-temir-ve-tikinti','Alətlər'],['937-ev-ve-bag-uchun-mehsullar','Ev və dekor'],['1232-bag-ve-bostan','Hobbi və bağ'],['15-noutbuklar-ve-komputer-texnikasi','Elektronika'],['2266-aksessuarlar-saatlar-bezek-eshyalari','Aksesuarlar']];
const products=new Map(existing.map(p=>[p.id,p]));
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'user-agent':'1001-Xirdavat-PublicCatalog/1.0'}});if(!r.ok)throw Error('Public source HTTP '+r.status);return r.text()}
function jsonld(html){const result=[];for(const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)){try{const p=JSON.parse(m[1]);result.push(...(Array.isArray(p)?p:p['@graph']||[p]))}catch{}}return result}
for(const [slug,category] of categories){
 if(products.size>=100)break;
 const html=await get('https://birmarket.az/categories/'+slug);
 const urls=[...new Set([...html.matchAll(/https:\/\/birmarket\.az\/product\/\d+-[a-zA-Z0-9-]+/g)].map(m=>m[0]))];
 for(const url of urls){
  if(products.size>=100)break;
  const sourceCode=url.match(/product\/(\d+)/)[1];if(products.has('bm-'+sourceCode))continue;
  try{
   const html=await get(url),p=jsonld(html).find(p=>p['@type']==='Product');
   if(!p)continue;const price=Number(p.offers?.lowPrice??p.offers?.price),img=Array.isArray(p.image)?p.image[0]:p.image;
   if(!p.name||!Number.isFinite(price)||price<=0||!/^https:\/\/strgimgr\.(umico\.az|b-cdn\.net)\//.test(img||''))continue;
   products.set('bm-'+sourceCode,{id:'bm-'+sourceCode,sku:'BM-'+sourceCode,name:p.name.slice(0,120),store:'nova',category,price,img,desc:'Məhsulun modeli və qiyməti açıq mənbə kataloqundan götürülüb. Mövcudluq satıcı tərəfindən təsdiqlənməlidir.',brand:p.brand?.name||'',sourceUrl:url,sourceCode,sourceDate:new Date().toISOString(),badge:'Mənbə kataloqu',inventoryVerified:false});
   console.log('Public products: '+products.size+'/100');
  }catch{console.log('Source item unavailable; skipped')}
  await new Promise(r=>setTimeout(r,250));
 }
}
if(products.size!==100)throw Error('Expected 100 validated products; got '+products.size);
await fs.writeFile('lib/catalog-data.json',JSON.stringify([...products.values()].map(p=>({...p,badge:'Mənbə kataloqu',inventoryVerified:false})),null,2)+'\n');
console.log('Saved 100 source-attributed facts. Stock must be supplied by a seller.');
