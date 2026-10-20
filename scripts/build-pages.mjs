import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
const output=path.resolve('.pages-output');await fs.mkdir(output,{recursive:true});
for(const name of ['app.js','market.js','style.css','commerce.css','market.css','product-placeholder.svg','favicon.svg'])await fs.copyFile(path.join('public',name),path.join(output,name));
let market=await fs.readFile(path.join(output,'market.js'),'utf8');market=market.replace("if(!r.ok)throw Error(v.error||'Əməliyyat tamamlanmadı.');", "if(r.status===401){location.assign('/login?next='+encodeURIComponent(location.pathname+location.search));throw Error('Daxil olun.')}if(!r.ok)throw Error(v.error||'Əməliyyat tamamlanmadı.');");await fs.writeFile(path.join(output,'market.js'),market);await fs.appendFile(path.join(output,'market.css'),'\n.pages-account{display:flex;justify-content:flex-end;gap:20px;padding:8px 5%;font-size:10px;background:#e5eddc}.pages-account a{text-decoration:underline}\n');
await build({entryPoints:['pages/worker.mjs'],outfile:path.join(output,'_worker.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:false});
await fs.writeFile(path.join(output,'_routes.json'),JSON.stringify({version:1,include:['/*'],exclude:[]}));
console.log('Cloudflare Pages package ready: '+output);
