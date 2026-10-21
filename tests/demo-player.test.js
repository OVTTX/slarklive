import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlayerDemo,stepPlayerDemo} from '../public/demo-player-core.js';
import {controlTournament,tournamentAnswer,eligible} from '../public/tournament-core.js';
const sample=()=>Array.from({length:25},(_,i)=>({type:'quiz',title:'Pergunta '+i,options:['A','B','C','D'],correct:0,seconds:20}));
function random(){let seed=123456;return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
test('teste contém uma pessoa, três companheiros bots e sete quartetos bots',()=>{
 const r=createPlayerDemo(sample());assert.equal(Object.keys(r.teams).length,8);
 const people=Object.values(r.teams).flatMap(t=>t.members);assert.equal(people.length,32);assert.equal(people.filter(m=>!m.bot).length,1);
 assert.equal(r.teams[r.playerTeamId].name,'Quarteto Conexão');assert.equal(r.teams[r.playerTeamId].members.filter(m=>m.bot).length,3);
 assert.equal(r.pin,'888888');assert.equal(r.playerCode,'000001');
});
test('os bots respondem pelos adversários, sem enviar nem sobrescrever a resposta humana',()=>{
 const r=createPlayerDemo(sample());controlTournament(r,'start',1000);stepPlayerDemo(r,1000,()=>0);
 stepPlayerDemo(r,9000,()=>0);assert.equal(Object.keys(r.answers[0]).length,7);assert.equal(r.answers[0][r.playerTeamId],undefined);assert(!r.revealed);
 tournamentAnswer(r,r.teams[r.playerTeamId],2,9500);stepPlayerDemo(r,10000,()=>0);assert.equal(r.answers[0][r.playerTeamId].option,2);assert(!r.revealed);stepPlayerDemo(r,21000,()=>0);assert(r.revealed);
 stepPlayerDemo(r,13000);assert.equal(r.index,0);stepPlayerDemo(r,40999);assert.equal(r.index,0);stepPlayerDemo(r,41000);assert.equal(r.index,1);assert(!r.revealed);
});
test('torneio avança sozinho até o campeão com uma pessoa respondendo',()=>{
 const r=createPlayerDemo(sample()),rng=random();controlTournament(r,'start',1000);
 for(let now=1000;now<1000000&&r.status==='active';now+=1000){
  stepPlayerDemo(r,now,rng);
  if(r.status==='active'&&r.openedAt&&!r.revealed&&eligible(r,r.playerTeamId)&&!r.answers[r.index]?.[r.playerTeamId])tournamentAnswer(r,r.teams[r.playerTeamId],0,now);
 }
 assert.equal(r.status,'closed');assert.equal(r.tournament.champion,r.playerTeamId);assert.equal(r.tournament.rounds.length,3);
});
test('sem resposta, prazo encerra pergunta e bots continuam após eliminar o jogador',()=>{
 const r=createPlayerDemo(sample()),rng=random();controlTournament(r,'start',1000);
 for(let now=1000;now<1000000&&r.status==='active';now+=1000)stepPlayerDemo(r,now,rng);
 assert.equal(r.status,'closed');assert.notEqual(r.tournament.champion,r.playerTeamId);
 for(const answers of Object.values(r.answers))assert.equal(answers[r.playerTeamId],undefined);
});
