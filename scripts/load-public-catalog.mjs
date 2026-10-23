import fs from 'node:fs/promises';import path from 'node:path';import {spawnSync} from 'node:child_process';import {catalogPlan} from './catalog-plan.mjs';
const config=path.resolve(process.argv[2]||'pages/wrangler.json'),store=process.argv[3]||'demo-store',file=path.resolve('.sites-runtime/catalog/import-'+Date.now()+'.sql');
function run(args){const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--remote','--config',config,'--json',...args],{encoding:'utf8',maxBuffer:10*1024*1024});if(r.status)throw Error('Catalog database operation failed');return args.includes('--file')?[]:JSON.parse(r.stdout)[0]?.results||[]}
const known=run(['--command',"SELECT id,status FROM stores WHERE id='"+store.replaceAll("'","''")+"'"]);if(!known.length||known[0].status!=='approved')throw Error('Select an existing approved catalog store');
await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,await catalogPlan(store));try{run(['--file',file])}finally{await fs.unlink(file)}
console.log(JSON.stringify({products:run(['--command','SELECT COUNT(*) n FROM products'])[0].n,invalidForeignKeys:run(['--command','PRAGMA foreign_key_check']).length}));

