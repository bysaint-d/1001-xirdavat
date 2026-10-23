import {markup} from '../app/site-markup.ts';
import {marketRequest} from '../lib/market-service.mjs';
import {identity,authRequest,reply,safeNext,audience} from './auth.mjs';
import {authPage,escape as esc} from './auth-ui.mjs';
import {DatabaseBucket} from './bucket.mjs';
const staticFiles=new Set(['/app.js','/market.js','/enhancements.js','/style.css','/commerce.css','/market.css','/enhancements.css','/product-placeholder.svg','/favicon.svg']);
function html(body,{status=200,title='1001-Xırdavat — mağazalar və ümumi bazar',description='Yerli mağazaları və məhsulları girişsiz kəşf et. Öz mağazanı yarat.',url,extra='',privatePage=false,staff=false}={}){
 const nonce=crypto.randomUUID().replaceAll('-','');return new Response(`<!doctype html><html lang="az"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website">${url?`<link rel="canonical" href="${esc(url)}"><meta property="og:url" content="${esc(url)}">`:''}${privatePage?'<meta name="robots" content="noindex,nofollow">':''}<link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/commerce.css"><link rel="stylesheet" href="/market.css"><link rel="stylesheet" href="/enhancements.css">${extra.replaceAll('nonce="NONCE"',`nonce="${nonce}"`)}</head><body class="${staff?'staff-mode':''}">${body.replaceAll('nonce="NONCE"',`nonce="${nonce}"`)}</body></html>`,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','x-frame-options':'DENY','permissions-policy':'camera=(), microphone=(), geolocation=()', 'content-security-policy':`default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`}});
}
const redirect=url=>Response.redirect(url,302);
export default {async fetch(request,env,ctx){try{
 const url=new URL(request.url),path=url.pathname;
 if(staticFiles.has(path))return env.ASSETS.fetch(request);
 if(path==='/favicon.ico')return redirect(new URL('/favicon.svg',url));
 if(path==='/api/health'){try{return reply({ok:!!await env.DB.prepare('SELECT 1 as ok').first(),host:'cloudflare-pages',apiVersion:1})}catch{return reply({ok:false},503)}}
 if(path==='/robots.txt')return new Response('User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /seller\nDisallow: /account\nDisallow: /api/\nSitemap: '+url.origin+'/sitemap.xml\n',{headers:{'content-type':'text/plain'}});
 if(path==='/sitemap.xml'){
  const products=(await env.DB.prepare("SELECT p.id FROM products p JOIN stores s ON s.id=p.store WHERE p.status='active' AND s.status='approved' LIMIT 10000").all()).results,stores=(await env.DB.prepare("SELECT slug FROM stores WHERE status='approved' LIMIT 10000").all()).results;
  return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['/',...products.map(p=>'/product/'+encodeURIComponent(p.id)),...stores.map(s=>'/shop/'+encodeURIComponent(s.slug))].map(p=>'<url><loc>'+esc(url.origin+p)+'</loc></url>').join('')+'</urlset>',{headers:{'content-type':'application/xml; charset=utf-8'}});
 }
 const user=await identity(request,env),a=audience(request);
 if(path.startsWith('/api/auth/'))return authRequest(request,env,user);
 if(path.startsWith('/api/'))return marketRequest(request,{...env,BUCKET:new DatabaseBucket(env.DB,user?.userId||'public')},user);
 const authRoutes={'/login':['login','buyer'],'/register':['register','buyer'],'/seller/login':['login','seller'],'/seller/register':['register','seller'],'/admin/login':['login','admin'],'/setup':['setup','buyer'],'/forgot-password':['forgot','buyer'],'/reset-password':['reset','buyer'],'/verify-email':['verify','buyer']};
 if(authRoutes[path]){const [mode,who]=authRoutes[path];return html(authPage({mode,audience:who,next:safeNext(url.searchParams.get('next')||(who==='admin'?'/admin':who==='seller'?'/seller':'/'))}),{privatePage:true})}
 if(path==='/signin-with-chatgpt')return redirect(new URL('/login',url));
 const staff=path==='/admin'||path.startsWith('/admin/'),seller=path==='/seller'||path.startsWith('/seller/'),privatePage=staff||seller||['/account','/orders','/checkout','/payment','/support','/notifications'].includes(path);
 if(privatePage&&!user){const login=staff?'/admin/login':seller?'/seller/login':'/login';return redirect(new URL(login+'?next='+encodeURIComponent(path+url.search),url))}
 if(staff&&!['admin','moderator'].includes(user?.role))return html('<main class="auth-wrap panel"><h1>Giriş icazəsi yoxdur</h1><a href="/">Bazara qayıt</a></main>',{status:403,privatePage:true});
 let title,description,extra='',summary='';
 if(path.startsWith('/product/')){
  const key=decodeURIComponent(path.split('/')[2]),p=await env.DB.prepare("SELECT p.*,s.name store_name FROM products p JOIN stores s ON s.id=p.store WHERE p.id=? AND p.status='active' AND s.status='approved'").bind(key).first();if(!p)return html('<main class="auth-wrap"><h1>Məhsul tapılmadı</h1><a href="/">Bazara qayıt</a></main>',{status:404});
  const payload=JSON.parse(p.payload);title=p.name+' — 1001-Xırdavat';description=payload.desc||p.name+' · '+p.store_name;const image=payload.img?new URL(payload.img,url).href:undefined;
  const schema={'@context':'https://schema.org','@type':'Product',name:p.name,description,sku:p.sku,...(image?{image} :{}),offers:{'@type':'Offer',priceCurrency:'AZN',price:(p.price/100).toFixed(2),availability:'https://schema.org/'+(p.stock?'InStock':'OutOfStock'),url:url.origin+path}};
  extra=(image?`<meta property="og:image" content="${esc(image)}">`:'')+'<script nonce="NONCE" type="application/ld+json">'+JSON.stringify(schema).replaceAll('<','\\u003c')+'</script>';
  summary=`<section id="serverSummary" class="panel"><h1>${esc(p.name)}</h1><p>${esc(description)}</p><b>${(p.price/100).toFixed(2)} ₼</b><p>${p.stock?'Stokda':'Stok bitib'}</p></section>`;
 }
 const known=path==='/'||path==='/cart'||path.startsWith('/product/')||path.startsWith('/shop/')||privatePage;
 if(!known)return html('<main class="auth-wrap"><h1>Səhifə tapılmadı</h1><a href="/">Bazara qayıt</a></main>',{status:404});
 const bar=`<div class="pages-account"><a href="/">Bazar</a>${staff?'<span>İdarəetmə</span><button data-logout>Çıxış</button>':`<a href="${user?(a==='seller'?'/account?as=seller':'/account'):'/login'}">${user?esc(user.displayName):'Müştəri girişi'}</a><a href="/seller/login">Satıcı girişi</a>${user?'<a href="/notifications'+(a==='seller'?'?as=seller':'')+'">Bildirişlər</a><button data-logout>Çıxış</button>':''}`}</div>`;
 return html(bar+markup.replace('<main>','<main>'+summary)+'<script src="/app.js?v=2"></script><script src="/market.js?v=2"></script><script src="/enhancements.js?v=2"></script>',{title,description,url:url.origin+path,extra,privatePage,staff});
 }catch(e){console.error('request failed');return html('<main class="auth-wrap panel"><h1>Əməliyyat tamamlanmadı</h1><p>Bir az sonra yenidən yoxla.</p><a href="/">Bazara qayıt</a></main>',{status:500,privatePage:true})}}};
