import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs/promises';import path from 'node:path';
import {encodeRow,decodeRow,digest,seal,unseal} from '../lib/portable-db.mjs';
const quote=s=>'"'+s.replaceAll('"','""')+'"';
export async function migrate(db){
 db.exec('PRAGMA foreign_keys=ON;CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY,checksum TEXT NOT NULL,applied_at TEXT NOT NULL)');
 for(const name of (await fs.readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){
  const sql=await fs.readFile('drizzle/'+name,'utf8'),checksum=await digest(sql.replaceAll('\r\n','\n')),existing=db.prepare('SELECT * FROM schema_migrations WHERE version=?').get(name);
  if(existing){if(existing.checksum!==checksum)throw Error('Migration checksum changed: '+name);continue}
  db.exec('BEGIN');try{db.exec(sql);db.prepare('INSERT INTO schema_migrations VALUES (?,?,?)').run(name,checksum,new Date().toISOString());db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
 }
}
export async function snapshot(db){
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' ORDER BY name").all().map(t=>t.name),data={};
 db.exec('BEGIN');try{for(const table of tables){const rows=db.prepare('SELECT * FROM '+quote(table)).all().map(encodeRow);data[table]={columns:db.prepare('PRAGMA table_info('+quote(table)+')').all().map(c=>c.name),rows,count:rows.length,checksum:await digest(JSON.stringify(rows))}}db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
 return {format:'1001-portable-database',version:1,createdAt:new Date().toISOString(),schemaVersion:db.prepare('SELECT version,checksum FROM schema_migrations ORDER BY version').all(),tables:data};
}
export async function restore(db,backup){
 if(backup.format!=='1001-portable-database'||backup.version!==1)throw Error('Unsupported portable backup');await migrate(db);
 const targetTables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(v=>v.name);
 for(const [table,entry] of Object.entries(backup.tables)){
  if(!targetTables.includes(table)||entry.count!==entry.rows.length||entry.checksum!==await digest(JSON.stringify(entry.rows)))throw Error('Backup integrity failed: '+table);
  const columns=db.prepare('PRAGMA table_info('+quote(table)+')').all().map(c=>c.name);if(JSON.stringify(columns)!==JSON.stringify(entry.columns))throw Error('Schema mismatch: '+table);
  if(db.prepare('SELECT COUNT(*) n FROM '+quote(table)).get().n&&table!=='schema_migrations'&&table!=='system_settings')throw Error('Restore target must be empty: '+table);
 }
 if(JSON.stringify(backup.schemaVersion)!==JSON.stringify(db.prepare('SELECT version,checksum FROM schema_migrations ORDER BY version').all()))throw Error('Migration version mismatch');
 const triggers=db.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger'").all();db.exec('PRAGMA foreign_keys=OFF;BEGIN');
 try{
  for(const trigger of triggers)db.exec('DROP TRIGGER '+quote(trigger.name));
  for(const [table,entry]of Object.entries(backup.tables)){
   db.exec('DELETE FROM '+quote(table));if(!entry.rows.length)continue;
   const insert=db.prepare('INSERT INTO '+quote(table)+' ('+entry.columns.map(quote).join(',')+') VALUES ('+entry.columns.map(()=>'?').join(',')+')');for(const row of entry.rows){const values=decodeRow(row);insert.run(...entry.columns.map(c=>values[c]))}
  }
  for(const trigger of triggers)db.exec(trigger.sql);
  const violations=db.prepare('PRAGMA foreign_key_check').all();if(violations.length)throw Error('Restored foreign keys failed');db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e}finally{db.exec('PRAGMA foreign_keys=ON')}
}
async function main(){
 const [command,file,target]=process.argv.slice(2);if(!command||!file)throw Error('Usage: node scripts/database.mjs migrate|verify|backup|restore DB_PATH [BACKUP_PATH]');
 await fs.mkdir(path.dirname(path.resolve(file)),{recursive:true});const db=new DatabaseSync(file);
 try{
  if(command==='migrate')await migrate(db);
  else if(command==='verify'){const integrity=db.prepare('PRAGMA integrity_check').get(),foreignKeys=db.prepare('PRAGMA foreign_key_check').all();console.log(JSON.stringify({integrity,foreignKeyViolations:foreignKeys.length}));if(foreignKeys.length||Object.values(integrity)[0]!=='ok')throw Error('Verification failed')}
  else if(command==='backup'||command==='restore'){
   if(!target)throw Error('Backup path required');let input='';for await(const chunk of process.stdin)input+=chunk;const {passphrase}=JSON.parse(input);if(typeof passphrase!=='string'||passphrase.length<16)throw Error('Read passphrase from stdin JSON; minimum 16 characters');
   if(command==='backup'){const data=await snapshot(db);await fs.writeFile(target,JSON.stringify(await seal(data,passphrase)),{flag:'wx'});console.log('Encrypted portable backup created')}
   else{await restore(db,await unseal(JSON.parse(await fs.readFile(target,'utf8')),passphrase));console.log('Database, identities and files restored; verified foreign keys')}
  }else throw Error('Unknown command');
 }finally{db.close()}
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1').replaceAll('%20',' ')))await main();
