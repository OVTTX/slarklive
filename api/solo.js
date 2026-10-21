import {randomUUID} from 'node:crypto';
import {fail,validateDeck} from './domain.js';
export function soloAction(s,{action,method,body:b,query,userId,admin,trails}){
 s.soloDecks??={};s.soloProgress??={};const allowed=new Set(trails.map(t=>t.id));
 if(action==='solo-publish'&&method==='POST'){
  if(!admin)fail('Somente a equipe pedagógica publica práticas.',403);
  if(!allowed.has(b.trailId))fail('Trilha fora do seu acesso.',403);
  const items=validateDeck(b.items).filter(x=>x.type==='quiz');if(!items.length)fail('Inclua pelo menos uma pergunta.');
  const deck={id:randomUUID(),owner:userId,trailId:b.trailId,title:String(b.title||'Prática da trilha').slice(0,100),chapter:String(b.chapter||'Revisão').slice(0,100),items};s.soloDecks[deck.id]=deck;return {id:deck.id};
 }
 if(action==='solo-catalog')return Object.values(s.soloDecks).filter(d=>allowed.has(d.trailId)).map(d=>({id:d.id,title:d.title,chapter:d.chapter,trailId:d.trailId,total:d.items.length,progress:s.soloProgress[userId]?.[d.id]||null}));
 const d=s.soloDecks[b.deckId||query.get('deck')];if(!d||!allowed.has(d.trailId))fail('Prática não encontrada nas suas trilhas.',404);
 if(action==='solo-deck')return {id:d.id,title:d.title,chapter:d.chapter,trailId:d.trailId,items:d.items.map(({correct,explanation,...x})=>x)};
 if(action==='solo-card'){
  const i=Number(query.get('index'));if(!Number.isInteger(i)||!d.items[i])fail('Cartão inválido.');const x=d.items[i];return {front:x.title,back:x.options[x.correct],explanation:x.explanation};
 }
 if(action==='solo-answer'&&method==='POST'){
  const i=Number(b.index),option=b.option;if(!Number.isInteger(i)||!d.items[i]||!Number.isInteger(option)||option<0||option>3)fail('Resposta inválida.');
  const x=d.items[i];s.soloProgress[userId]??={};const progress=s.soloProgress[userId][d.id]??={answers:{}};
  progress.answers[i]={correct:option===x.correct,at:new Date().toISOString()};progress.completed=Object.keys(progress.answers).length;progress.correct=Object.values(progress.answers).filter(x=>x.correct).length;
  const botCorrect=Math.random()<0.65;return {correct:option===x.correct,answer:x.correct,explanation:x.explanation,botCorrect,progress};
 }
 fail('Operação de prática inválida.',404);
}
