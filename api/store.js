import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
let queue=Promise.resolve(),pool;
export function transact(fn){
 const task=queue.then(async()=>{
 if(process.env.DATABASE_URL){
  const schema=process.env.SLARKLIVE_DATABASE_SCHEMA||'slarklive_private';
  if(!['slarklive_private','slarklive_preview_private'].includes(schema))throw Object.assign(new Error('Schema de armazenamento inválido.'),{status:503});
  if(!pool){
   const {Pool}=await import('pg');
   // Connection-string SSL flags must not override certificate validation.
   const url=new URL(process.env.DATABASE_URL);
   for(const key of ['sslmode','sslcert','sslkey','sslrootcert','ssl'])url.searchParams.delete(key);
   pool=new Pool({connectionString:url.toString(),max:1,ssl:{rejectUnauthorized:true,...(process.env.SLARKLIVE_DATABASE_CA_CERT?{ca:process.env.SLARKLIVE_DATABASE_CA_CERT}:{})},connectionTimeoutMillis:10000,idleTimeoutMillis:10000,query_timeout:15000,allowExitOnIdle:true});
  }
  const c=await pool.connect();let begun=false;
  try {
   await c.query('BEGIN');begun=true;
   await c.query("SET LOCAL statement_timeout = '15s'");
   await c.query("SET LOCAL lock_timeout = '10s'");
   await c.query("SET LOCAL idle_in_transaction_session_timeout = '30s'");
   const q=await c.query(`SELECT data FROM ${schema}.state WHERE id=1 FOR UPDATE`);
   const state=q.rows[0]?.data;
   if(q.rowCount!==1||!state||typeof state!=='object'||Array.isArray(state)||!state.rooms||typeof state.rooms!=='object'||Array.isArray(state.rooms))throw Object.assign(new Error('O armazenamento das salas não foi inicializado corretamente.'),{status:503});
   const result=await fn(state);
   const updated=await c.query(`UPDATE ${schema}.state SET data=$1 WHERE id=1`,[JSON.stringify(state)]);
   if(updated.rowCount!==1)throw Object.assign(new Error('Não foi possível salvar o estado da sala.'),{status:503});
   await c.query('COMMIT');begun=false;return result;
  }catch(e){if(begun){try{await c.query('ROLLBACK');}catch{}}if(e.code==='P0001'&&e.message?.startsWith('Slark Live:'))throw Object.assign(new Error(e.message),{status:409});throw e;}finally{c.release();}
 }
 if(process.env.VERCEL)throw Object.assign(new Error('O armazenamento das salas ainda não foi ativado. A equipe Slark precisa concluir a configuração para criar e salvar salas.'),{status:503});
 await mkdir('.data',{recursive:true});let state;try{state=JSON.parse(await readFile('.data/state.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;state={rooms:{}};}
 const result=await fn(state);await writeFile('.data/state.tmp',JSON.stringify(state));await rename('.data/state.tmp','.data/state.json');return result;
 });queue=task.catch(()=>{});return task;
}
