import {tournamentView,tournamentAnswer,teamLabel,eligible} from './tournament.js';
export const traits=['Observador','Detalhista','Criativo','Raciocínio lógico'];
export function fail(message,status=400){throw Object.assign(new Error(message),{status});}
export function validateDeck(items){
 if(!Array.isArray(items)||!items.length||items.length>80)fail('Inclua de 1 a 80 slides ou perguntas.');
 return items.map((x,i)=>{
  if(!['slide','quiz'].includes(x.type))fail('Tipo de item inválido.');
  const title=String(x.title||'').trim();if(!title||title.length>200)fail(`Preencha o título do item ${i+1} (até 200 caracteres).`);
  if(x.type==='slide')return {type:'slide',title,text:String(x.text||'').slice(0,6000)};
  if(!Array.isArray(x.options)||x.options.length!==4||x.options.some(a=>!String(a).trim()||String(a).length>300))fail('Cada quiz precisa de quatro alternativas preenchidas (até 300 caracteres).');
  if(!Number.isInteger(x.correct)||x.correct<0||x.correct>3)fail('Selecione uma alternativa correta.');
  const seconds=Number(x.seconds);if(!Number.isInteger(seconds)||seconds<5||seconds>300)fail('Tempo de pergunta: 5 a 300 segundos.');
  return {type:'quiz',title,options:x.options.map(String),correct:x.correct,seconds,explanation:String(x.explanation||'').slice(0,2000)};
 });
}
export function currentItem(r,privileged=false){
 const x=r.items[r.index];if(!x)return null;
 if(privileged||r.revealed)return {...x};
 const {correct,explanation,...safe}=x;return safe;
}
export function summary(r){return {pin:r.pin,name:r.name,chapter:r.chapter,trailId:r.trailId,status:r.status,index:r.index,total:r.items.length,openedAt:r.openedAt,endsAt:r.endsAt,revealed:r.revealed,item:currentItem(r),demo:r.demo,...(r.tournament?{tournament:tournamentView(r)}:{}),teams:Object.values(r.teams).map(t=>({name:r.tournament?teamLabel(r,t.id):t.name,joined:!!t.token})),responses:Object.values(r.answers[r.index]||{}).length};}
export function teacherView(r){return {...summary(r),items:r.items,teams:Object.values(r.teams).map(t=>({id:t.id,name:t.name,code:t.code,members:t.members,joined:!!t.token})),answers:r.answers,observations:r.observations};}
export function answer(r,t,option,now=Date.now()){
 if(r.tournament)return tournamentAnswer(r,t,option,now);
 if(r.status!=='active'||r.items[r.index]?.type!=='quiz'||r.revealed||!r.openedAt||now>=r.endsAt)fail('Esta pergunta não está aberta.');
 if(!Number.isInteger(option)||option<0||option>3)fail('Alternativa inválida.');
 r.answers[r.index]??={};if(r.answers[r.index][t.id])fail('Seu quarteto já respondeu a esta pergunta.',409);
 r.answers[r.index][t.id]={option,elapsedMs:now-r.openedAt,correct:option===r.items[r.index].correct};
}
export function results(r,t){return r.items.flatMap((x,i)=>x.type==='quiz'&&(r.tournament?r.tournament.revealedItems.includes(i):(r.revealed&&i===r.index||i<r.index||r.status==='closed'))?[{question:x.title,correct:x.correct,explanation:x.explanation,answer:r.answers[i]?.[t.id]||null}]:[]);}
