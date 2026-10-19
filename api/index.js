import {randomInt,randomUUID,createHmac,timingSafeEqual} from 'node:crypto';
import {transact} from './store.js';
import {fail,validateDeck,summary,teacherView,answer,results,traits} from './domain.js';
import {teacherInfo,catalog,loadTeams,saveObservation,withSlarkSession} from './slark.js';
const attempts=new Map();
function sign(x){return createHmac('sha256',process.env.SESSION_SECRET||'').update(x).digest('hex');}
function equal(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function identity(req){
 const value=(req.headers.cookie||'').split('; ').find(x=>x.startsWith('slark_admin='))?.slice(12)||'';
 const [id,exp,sig]=value.split('.');
 return process.env.SESSION_SECRET?.length>=32&&Number(exp)>Date.now()&&equal(sig||'',sign(`${id}.${exp}`))?id:null;
}
function setSession(res,id){const exp=String(Date.now()+3600000),payload=`${id}.${exp}`;res.setHeader('Set-Cookie',`slark_admin=${payload}.${sign(payload)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${process.env.VERCEL?'; Secure':''}`);}
async function body(req){if(req.body&&typeof req.body==='object')return req.body;let s='';for await(const c of req){s+=c;if(s.length>100000)fail('Envio muito grande.',413);}try{return JSON.parse(s||'{}')}catch{fail('Dados inválidos.');}}
async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 try{
 const u=new URL(req.url,'http://localhost');const action=u.searchParams.get('action')||'rooms';const b=req.method==='POST'?await body(req):{};
 if(req.method==='POST'&&req.headers.origin&&req.headers.origin!==`https://${req.headers.host}`&&req.headers.origin!==`http://${req.headers.host}`)fail('Origem não permitida.',403);
 if(!['GET','POST'].includes(req.method))fail('Método não permitido.',405);
 if(action==='login'&&req.method==='POST'){
  if(!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32)fail('Configure SESSION_SECRET (32 caracteres ou mais).',503);
  const ip=req.headers['x-forwarded-for']?.split(',')[0]||req.socket?.remoteAddress||'unknown';const now=Date.now(),a=attempts.get(ip)||{n:0,until:now+600000};if(a.until<now){a.n=0;a.until=now+600000;}if(a.n>=8)fail('Muitas tentativas. Aguarde dez minutos.',429);a.n++;attempts.set(ip,a);
  let id;
  if(b.email){
   if(!process.env.SUPABASE_URL||!process.env.SUPABASE_PUBLISHABLE_KEY)fail('Configure a autenticação da Slark no servidor.',503);
   const response=await fetch(process.env.SUPABASE_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:process.env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:String(b.email),password:String(b.password||'')}),signal:AbortSignal.timeout(10000)});
   const auth=await response.json();if(!response.ok||!auth.user?.id)fail('E-mail ou senha inválidos.',401);await withSlarkSession(auth.access_token,()=>teacherInfo(auth.user.id));id=auth.user.id;res.slarkAccessToken=auth.access_token;
  }else{
   if(process.env.ENABLE_DEMO!=='1'||!process.env.ADMIN_PASSWORD||!equal(String(b.password||''),process.env.ADMIN_PASSWORD))fail('E-mail e senha do professor são necessários.',401);id='demo';
  }
  attempts.delete(ip);setSession(res,id);if(res.slarkAccessToken){const signed=res.getHeader('Set-Cookie');res.setHeader('Set-Cookie',[signed,`slark_access=${res.slarkAccessToken}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${process.env.VERCEL?'; Secure':''}`]);}return res.end(JSON.stringify({ok:true}));
 }
 if(action==='logout'){res.setHeader('Set-Cookie',['slark_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0','slark_access=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0']);return res.end('{}');}
 const owner=identity(req);
 if(action==='session')return res.end(JSON.stringify({admin:!!owner,demo:owner==='demo',demoEnabled:process.env.ENABLE_DEMO==='1'}));
 if(owner&&owner!=='demo')await teacherInfo(owner);
 if(action==='catalog'){if(!owner)fail('Entre como professor.',401);return res.end(JSON.stringify(owner==='demo'?[{id:'demo-trail',titulo:'Runaway · Produção e consumo',sala_id:'demo'}]:await catalog(owner)));}
 let imported;
 if(action==='create'){
  if(!owner)fail('Entre como professor.',401);
  if(owner==='demo')imported={trail:{id:'demo-trail',titulo:'Trilha demonstrativa'},teams:[0,1].map(i=>({id:`demo-${i}`,name:`Quarteto ${i+1}`,members:[0,1,2,3].map(j=>({id:`demo-${i}-${j}`,name:`Estudante fictício ${i*4+j+1}`}))}))};
  else imported=await loadTeams(owner,String(b.trailId||''));
 }
 const result=await transact(async s=>{
 const own=r=>{if(!owner||r.owner!==owner)fail('Sala de outro professor ou acesso não autorizado.',403);};
 const rooms=Object.values(s.rooms).filter(r=>r.version===2);
 if(action==='rooms'){if(!owner)fail('Entre como professor.',401);return rooms.filter(r=>r.owner===owner).map(summary);}
 if(action==='create'&&req.method==='POST'){
  const items=validateDeck(b.items);let pin;do{pin=String(randomInt(100000,1000000));}while(s.rooms[pin]);
  const teams=Object.fromEntries(imported.teams.map(t=>[t.id,{...t,code:randomUUID().slice(0,8),token:null}]));
  const r={version:2,owner,pin,name:String(b.name||'Slark Live Room').slice(0,100),chapter:String(b.chapter||'Fim do capítulo').slice(0,100),trailId:imported.trail.id,demo:owner==='demo',items,teams,status:'ready',index:-1,openedAt:null,endsAt:null,revealed:false,answers:{},observations:[]};s.rooms[pin]=r;return teacherView(r);
 }
 const p=String(b.pin||u.searchParams.get('pin')||'');const r=s.rooms[p];if(!r||r.version!==2)fail('Sala não encontrada. Confira o PIN.',404);
 if(action==='teacher'){own(r);return teacherView(r);}
 if(action==='room')return summary(r);
 if(action==='control'&&req.method==='POST'){
  own(r);
  if(b.command==='start'||b.command==='next'){
   if(b.command==='start'&&r.status!=='ready')fail('A sala já foi iniciada.');
   if(b.command==='next'&&r.status!=='active')fail('Inicie a sala primeiro.');
   if(r.index>=0&&r.items[r.index].type==='quiz'&&!r.revealed)fail('Revele a resposta antes de avançar.');
   r.index++;r.openedAt=null;r.endsAt=null;r.revealed=false;
   if(r.index>=r.items.length){r.status='closed';r.index=r.items.length;}else r.status='active';
  }else if(b.command==='open'){
   if(r.status!=='active'||r.items[r.index]?.type!=='quiz'||r.revealed||r.openedAt)fail('Esta pergunta não pode ser aberta novamente.');r.openedAt=Date.now();r.endsAt=r.openedAt+r.items[r.index].seconds*1000;
  }else if(b.command==='reveal'){
   if(r.status!=='active'||r.items[r.index]?.type!=='quiz'||!r.openedAt)fail('Abra uma pergunta antes de revelar.');r.revealed=true;r.endsAt=Math.min(r.endsAt,Date.now());
  }else if(b.command==='close'){r.status='closed';r.endsAt=null;}
  else fail('Comando inválido.');return teacherView(r);
 }
 if(action==='observe'&&req.method==='POST'){
  own(r);const student=String(b.student||''),text=String(b.text||'').trim(),trait=String(b.trait||'');
  if(!Object.values(r.teams).some(t=>t.members.some(m=>m.id===student)))fail('Aluno fora dos quartetos desta sala.');
  if(text.length<10||text.length>2000||!traits.includes(trait))fail('Escolha a característica e descreva uma evidência de 10 a 2.000 caracteres.');
  const note={id:randomUUID(),student,trait,text,at:new Date().toISOString(),synced:false};
  if(!r.demo){note.slarkId=await saveObservation({teacher:owner,student,trailId:r.trailId,text:`[Slark Live · ${r.chapter} · ${trait}] ${text}`});note.synced=true;}
  r.observations.push(note);return note;
 }
 if(action==='join'&&req.method==='POST'){
  if(r.status==='closed')fail('Esta sessão foi encerrada.');
  const t=Object.values(r.teams).find(t=>equal(t.code,String(b.teamCode||'')));if(!t)fail('Código do quarteto incorreto. Peça ao professor.',403);
  if(t.token&&t.token!==b.token)fail('O quarteto já tem um dispositivo conectado. Usem o dispositivo da equipe.',409);
  t.token??=randomUUID();return {token:t.token,name:t.name};
 }
 const t=Object.values(r.teams).find(t=>t.token&&equal(t.token,String(b.token||u.searchParams.get('token')||'')));if(!t)fail('Conecte seu quarteto com os códigos da sala e da equipe.',401);
 if(action==='state')return {...summary(r),team:{name:t.name},answered:!!r.answers[r.index]?.[t.id],results:results(r,t)};
 if(action==='answer'&&req.method==='POST'){answer(r,t,b.option);return {ok:true};}
 fail('Ação não encontrada.',404);
 });res.end(JSON.stringify(result));
 }catch(e){res.statusCode=e.status||503;res.end(JSON.stringify({error:e.status?e.message:'Serviço indisponível. Verifique a configuração do servidor.'}));if(!e.status)console.error(e.message);}
}

export default function(req,res){const access=(req.headers.cookie||'').split('; ').find(x=>x.startsWith('slark_access='))?.slice(13);return withSlarkSession(access,()=>handler(req,res));}
