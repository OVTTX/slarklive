import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runDemoBots} from '../public/demo-bots.js';
import {initTournament,controlTournament} from '../public/tournament-core.js';
function fixture(n=8){const r={demo:true,status:'ready',teams:Object.fromEntries(Array.from({length:n},(_,i)=>['t'+i,{id:'t'+i,name:'Bot '+i}])),items:Array.from({length:25},()=>({type:'quiz',correct:0,seconds:30})),answers:{},index:-1};initTournament(r,m=>m-1);controlTournament(r,'start');return r;}
test('bots aguardam a abertura e o tempo de resposta; respondem uma vez',()=>{
 const r=fixture();assert.equal(runDemoBots(r,1000,()=>0),0);controlTournament(r,'open',1000);
 assert.equal(runDemoBots(r,1000,()=>0),0);assert.equal(runDemoBots(r,3000,()=>0),8);
 assert.equal(runDemoBots(r,4000,()=>0),0);assert.equal(Object.keys(r.answers[0]).length,8);
 controlTournament(r,'reveal',4000);assert.equal(runDemoBots(r,5000),0);
 controlTournament(r,'next');controlTournament(r,'open',6000);assert.equal(runDemoBots(r,8000,()=>0),8);
});
test('bots podem errar; quartetos sem adversário e respostas vencidas não são simulados',()=>{
 const r=fixture(5);controlTournament(r,'open',1000);assert.equal(runDemoBots(r,10000,()=>0.99),2);
 assert(Object.values(r.answers[0]).every(a=>!a.correct));
 const expired=fixture();controlTournament(expired,'open',1000);assert.equal(runDemoBots(expired,31000),0);
});
test('simulador não altera salas reais',()=>{const r=fixture();r.demo=false;controlTournament(r,'open',1000);assert.equal(runDemoBots(r,10000),0);assert.deepEqual(r.answers,{});});
