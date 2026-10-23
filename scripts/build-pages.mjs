import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
const output=path.resolve('.pages-output');await fs.mkdir(output,{recursive:true});
for(const name of ['info.js','app.js','market.js','enhancements.js','enhancements.css','style.css','commerce.css','market.css','product-placeholder.svg','favicon.svg'])await fs.copyFile(path.join('public',name),path.join(output,name));
await build({entryPoints:['pages/worker.mjs'],outfile:path.join(output,'_worker.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:false});
await fs.writeFile(path.join(output,'_routes.json'),JSON.stringify({version:1,include:['/*'],exclude:[]}));
console.log('Cloudflare Pages package ready: '+output);
