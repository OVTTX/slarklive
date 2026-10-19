import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
let queue=Promise.resolve(),pool;
export function transact(fn){
 const task=queue.then(async()=>{
 if(process.env.DATABASE_URL){
  if(!pool){const {Pool}=await import('pg');pool=new Pool({connectionString:process.env.DATABASE_URL,max:3});}
  const c=await pool.connect();
  try {await c.query('CREATE TABLE IF NOT EXISTS slarklive_state (id integer PRIMARY KEY, data jsonb NOT NULL)');await c.query("INSERT INTO slarklive_state VALUES (1, '{\"rooms\":{}}') ON CONFLICT DO NOTHING");await c.query('ALTER TABLE slarklive_state ENABLE ROW LEVEL SECURITY');await c.query('BEGIN');const q=await c.query('SELECT data FROM slarklive_state WHERE id=1 FOR UPDATE');const state=q.rows[0].data; const result=await fn(state);await c.query('UPDATE slarklive_state SET data=$1 WHERE id=1',[JSON.stringify(state)]);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 if(process.env.VERCEL)throw Object.assign(new Error('O armazenamento das salas ainda não foi ativado. A equipe Slark precisa concluir a configuração para criar e salvar salas.'),{status:503});
 await mkdir('.data',{recursive:true});let state;try{state=JSON.parse(await readFile('.data/state.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;state={rooms:{}};}
 const result=await fn(state);await writeFile('.data/state.tmp',JSON.stringify(state));await rename('.data/state.tmp','.data/state.json');return result;
 });queue=task.catch(()=>{});return task;
}
