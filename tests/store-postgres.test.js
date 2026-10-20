import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';

const database=process.env.SLARKLIVE_TEST_DATABASE_URL;
const schema=process.env.SLARKLIVE_TEST_DATABASE_SCHEMA||'slarklive_preview_private';
const storeUrl=new URL('../api/store.js',import.meta.url).href;
function worker(source,probe){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['--input-type=module','--eval',source],{env:{...process.env,DATABASE_URL:database,SLARKLIVE_DATABASE_SCHEMA:schema,SLARKLIVE_PROBE:probe},stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk;});
  child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(`Worker de persistência falhou (${code}): ${stderr}`)));
 });
}

test('Postgres: transações em processos independentes preservam incrementos e fazem rollback',{skip:!database,timeout:90000},async()=>{
 // Unique root-level probe: never edits a room, team, answer or observation.
 const probe='__slarklive_storage_probe_'+randomUUID().replaceAll('-','');
 const prelude=`import {transact} from ${JSON.stringify(storeUrl)}; const probe=process.env.SLARKLIVE_PROBE;`;
 await worker(prelude+`await transact(s=>{s[probe]={count:0};});`,probe);
 try{
  const increment=prelude+`for(let i=0;i<6;i++)await transact(async s=>{const value=s[probe].count;await new Promise(r=>setTimeout(r,8));s[probe].count=value+1;});`;
  await Promise.all(Array.from({length:3},()=>worker(increment,probe)));
  await worker(prelude+`let rolled=false;try{await transact(s=>{s[probe].count=999;throw Error('expected rollback probe');});}catch(e){if(e.message!=='expected rollback probe')throw e;rolled=true;}if(!rolled)throw Error('Expected transaction failure');await transact(s=>{if(s[probe].count!==18)throw Error('Concurrent updates lost or rollback persisted');});`,probe);
  assert.ok(true);
 }finally{
  await worker(prelude+`await transact(s=>{delete s[probe];});`,probe);
 }
});

 test('Postgres preview: role restrito ao schema de preview e sem privilégios administrativos',{skip:!database||schema!=='slarklive_preview_private',timeout:20000},async()=>{
  const {Pool}=await import('pg');const url=new URL(database);
  for(const key of ['sslmode','sslcert','sslkey','sslrootcert','ssl'])url.searchParams.delete(key);
  const pool=new Pool({connectionString:url.toString(),max:1,ssl:{rejectUnauthorized:true,...(process.env.SLARKLIVE_DATABASE_CA_CERT?{ca:process.env.SLARKLIVE_DATABASE_CA_CERT}:{})},connectionTimeoutMillis:10000,query_timeout:10000});
  try{
   const role=(await pool.query('SELECT rolsuper,rolcreaterole,rolcreatedb,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
   assert.deepEqual(role,{rolsuper:false,rolcreaterole:false,rolcreatedb:false,rolbypassrls:false});
   const access=(await pool.query("SELECT has_schema_privilege(current_user,'slarklive_private','USAGE') AS production,has_schema_privilege(current_user,'slarklive_preview_private','USAGE') AS preview")).rows[0];
   assert.equal(access.production,false);assert.equal(access.preview,true);
   const tables=(await pool.query("SELECT n.nspname,has_table_privilege(current_user,c.oid,'SELECT') AS can_read,has_table_privilege(current_user,c.oid,'UPDATE') AS can_write,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relname='state' AND n.nspname IN ('slarklive_private','slarklive_preview_private')")).rows;
   const production=tables.find(x=>x.nspname==='slarklive_private');assert.ok(production);assert.equal(production.can_read,false);assert.equal(production.can_write,false);
   const preview=tables.find(x=>x.nspname==='slarklive_preview_private');assert.ok(preview);assert.equal(preview.can_read,true);assert.equal(preview.can_write,true);assert.equal(preview.relrowsecurity,true);
  }finally{await pool.end();}
 });
