import {randomInt,randomUUID,createHmac,timingSafeEqual} from 'node:crypto';
import {transact} from './store.js';
import {profile,publicRoom} from './domain.js';
const attempts=new Map();
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
function sign(x){return createHmac('sha256',process.env.SESSION_SECRET||'').update(x).digest('hex');}
function equal(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function admin(req){const value=(req.headers.cookie||'').split('; ').find(x=>x.startsWith('slark_admin='))?.slice(12)||'';const [exp,sig]=value.split('.');return !!process.env.SESSION_SECRET&&Number(exp)>Date.now()&&equal(sig||'',sign(exp||''));}
async function body(req){if(req.body&&typeof req.body==='object')return req.body;let s='';for await(const c of req){s+=c;if(s.length>12000)fail('Envio muito grande.',413);}try{return JSON.parse(s||'{}')}catch{fail('Dados inválidos.');}}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 try{
 const u=new URL(req.url,'http://localhost');const action=u.searchParams.get('action')||'rooms';const b=req.method==='POST'?await body(req):{};
 if(req.method==='POST'&&req.headers.origin&&req.headers.origin!==`https://${req.headers.host}`&&req.headers.origin!==`http://${req.headers.host}`)fail('Origem não permitida.',403);
 if(!['GET','POST'].includes(req.method))fail('Método não permitido.',405);
 if(action==='login'&&req.method==='POST'){
  if(!process.env.ADMIN_PASSWORD||!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32)fail('Configure ADMIN_PASSWORD e SESSION_SECRET (32 caracteres ou mais).',503);
  const ip=req.headers['x-forwarded-for']?.split(',')[0]||req.socket?.remoteAddress||'unknown';const now=Date.now(),a=attempts.get(ip)||{n:0,until:now+600000};if(a.until<now){a.n=0;a.until=now+600000;}if(a.n>=8)fail('Muitas tentativas. Aguarde dez minutos.',429);a.n++;attempts.set(ip,a);
  if(!equal(String(b.password||''),process.env.ADMIN_PASSWORD))fail('Senha incorreta.',401);attempts.delete(ip);const exp=String(now+8*3600000);res.setHeader('Set-Cookie',`slark_admin=${exp}.${sign(exp)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.VERCEL?'; Secure':''}`);return res.end(JSON.stringify({ok:true}));
 }
 if(action==='logout'){res.setHeader('Set-Cookie','slark_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return res.end('{}');}
 if(action==='session')return res.end(JSON.stringify({admin:admin(req)}));
 const result=await transact(s=>{
 if(action==='rooms'){if(!admin(req))fail('Entre como administrativo.',401);return Object.values(s.rooms).map(publicRoom);}
 if(action==='create'&&req.method==='POST'){
  if(!admin(req))fail('Acesso administrativo necessário.',401);let pin;do{pin=String(randomInt(100000,1000000));}while(s.rooms[pin]);const minutes=Number(b.minutes??25);if(!Number.isFinite(minutes)||minutes<1||minutes>60)fail('Duração entre 1 e 60 minutos.');s.rooms[pin]={pin,name:String(b.name||'Sessão FeCEAP').slice(0,60),mode:b.mode==='evaluator'?'evaluator':'group',status:'ready',minutes,endsAt:null,nextAt:null,people:{}};return publicRoom(s.rooms[pin]);
 }
 const pin=String(b.pin||u.searchParams.get('pin')||'');const room=s.rooms[pin];if(!room)fail('PIN não encontrado. Confira os seis números.',404);
 if(action==='room')return publicRoom(room);
 if(action==='control'&&req.method==='POST'){
  if(!admin(req))fail('Acesso administrativo necessário.',401);
  if(b.command==='start'){room.status='active';room.endsAt=Date.now()+room.minutes*60000;room.nextAt=null;}
  else if(b.command==='break'){room.status='break';room.endsAt=null;room.nextAt=Date.now()+30*60000;}
  else if(b.command==='reset'){room.people={};room.status='ready';room.endsAt=null;room.nextAt=null;}
  else if(b.command==='close'){room.status='closed';room.endsAt=null;room.nextAt=null;}
  else if(b.command==='demo'){room.demo=!room.demo;}
  else if(b.command==='review'){const p=room.people[b.person];if(!p?.answer)fail('Entrega não encontrada.');p.review=String(b.review||'').trim().slice(0,1500);}
  else fail('Comando inválido.');return publicRoom(room);
 }
 if(action==='submissions'){if(!admin(req))fail('Acesso administrativo necessário.',401);return Object.entries(room.people).map(([id,p])=>({id,alias:p.alias,profile:p.profile,answer:p.answer,review:p.review}));}
 const person=room.people[b.token||u.searchParams.get('token')];
 if(action==='me'){if(!person)fail('Entre novamente usando o PIN.',401);return person;}
 if(action==='join'&&req.method==='POST'){
  if(room.status!=='active'||(room.endsAt&&Date.now()>=room.endsAt))fail('Aguarde o administrativo iniciar a sessão.');
  if(person)return {token:b.token,person};if(room.mode==='evaluator'&&Object.keys(room.people).length)fail('Esta sala de avaliador já está ocupada. Peça outro PIN.');if(Object.keys(room.people).length>=100)fail('Sala cheia.');const token=randomUUID();room.people[token]={alias:`Explorador ${Object.keys(room.people).length+1}`};return {token,person:room.people[token]};
 }
 if(!person)fail('Entre novamente com o PIN.',401);
 if(room.status!=='active'||Date.now()>=room.endsAt)fail('Sessão encerrada. Peça ao administrativo para iniciar outra sessão.');
 if(action==='profile'&&req.method==='POST'){person.profile=profile(b.answers);person.answers=b.answers;return person;}
 if(action==='submit'&&req.method==='POST'){if(!person.profile)fail('Conclua primeiro o questionário.');const answer=String(b.answer||'').trim();if(answer.length<30||answer.length>1500)fail('Escreva uma resposta entre 30 e 1.500 caracteres.');person.answer=answer;return person;}
 fail('Ação não encontrada.',404);
 });res.end(JSON.stringify(result));
 }catch(e){res.statusCode=e.status||503;res.end(JSON.stringify({error:e.status?e.message:'Serviço indisponível. Verifique a configuração do servidor.'}));if(!e.status)console.error(e.message);}
}
