import fs from 'node:fs/promises';import path from 'node:path';import {spawnSync} from 'node:child_process';
const root=process.cwd(),config=JSON.parse(await fs.readFile('pages/wrangler.json','utf8')),stage=path.resolve('.sites-runtime/deploy');
if(!/^[a-z0-9-]+$/.test(config.name)||!config.d1_databases?.find(d=>d.binding==='DB'))throw Error('Configure your own Pages project and D1 binding first');
const build=spawnSync(process.execPath,['scripts/build-pages.mjs'],{stdio:'inherit'});if(build.status)process.exit(build.status);
await fs.mkdir(path.join(stage,'public'),{recursive:true});await fs.cp('.pages-output',path.join(stage,'public'),{recursive:true});await fs.writeFile(path.join(stage,'wrangler.json'),JSON.stringify({...config,pages_build_output_dir:'./public'},null,2));
const deploy=spawnSync(process.execPath,[path.join(root,'node_modules/wrangler/bin/wrangler.js'),'pages','deploy','public','--project-name',config.name,'--branch',process.env.DEPLOY_BRANCH||'main','--commit-dirty=true'],{cwd:stage,env:{...process.env,WRANGLER_SEND_METRICS:'false'},stdio:'inherit'});process.exitCode=deploy.status??1;
