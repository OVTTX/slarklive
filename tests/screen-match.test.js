import {test} from 'node:test';
import assert from 'node:assert/strict';
import {screenMatchHtml} from '../public/screen-match.js';
import {summary} from '../api/domain.js';
import {initTournament,controlTournament,tournamentAnswer} from '../api/tournament.js';
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function room(){const r={pin:'123456',name:'Sala',chapter:'Runaway',status:'ready',index:-1,items:Array.from({length:25},()=>({type:'quiz',title:'Qual planeta?',options:['Vênus','Marte','Júpiter','Saturno'],correct:1,seconds:20,explanation:'GABARITO_PRIVADO'})),teams:Object.fromEntries(Array.from({length:8},(_,i)=>['t'+i,{id:'t'+i,name:'PRIVADO_'+i,token:'token-secreto-'+i,code:'codigo-secreto-'+i,members:[{name:'PESSOA_PRIVADA'}]}])),answers:{}};initTournament(r,m=>m-1);controlTournament(r,'start',1000);controlTournament(r,'open',1000);return r;}
test('telão de partida segue composição de pergunta, quatro alternativas, tempo e chaveamento',()=>{
 const r=room();tournamentAnswer(r,r.teams.t0,1,2000);const publicState=summary(r),html=screenMatchHtml(publicState,esc);
 for(const part of ['screen-question-card','TEMPO RESTANTE','screenTimeBar','data-format="minutes"','Partida ao vivo','Tela cheia','Sala 123456','Todos os quartetos'])assert(html.includes(part),part);
 assert.equal((html.match(/class="match-letter"/g)||[]).length,4);
 for(const secret of ['GABARITO_PRIVADO','PRIVADO_0','PESSOA_PRIVADA','token-secreto','codigo-secreto'])assert(!html.includes(secret),secret);
 assert(!html.includes('option-correct'));assert(!html.includes('screen-knockout'));assert(!html.includes('Quarteto 01'));assert(!html.includes('Aguardando Quarteto'));
 assert.equal(publicState.teams[0].answered,true);assert.equal(publicState.tournament.history[0].matches[0].scoreA,0);
});
test('gabarito e placar só aparecem após revelar',()=>{
 const r=room();tournamentAnswer(r,r.teams.t0,1,2000);controlTournament(r,'reveal',3000);
 const state=summary(r),html=screenMatchHtml(state,esc);assert(html.includes('option-correct'));assert(html.includes('GABARITO_PRIVADO'));assert.equal(state.tournament.history[0].matches[0].scoreA,1);
});
test('apresentação de slides continua funcionando no novo telão sem inventar chaveamento',()=>{
 const r={pin:'456789',name:'Aula',chapter:'Capítulo 1',status:'active',index:0,total:1,responses:0,item:{type:'slide',title:'Produção',text:'Texto do slide'},teams:[{name:'Quarteto <Teste>',joined:true}]};
 const html=screenMatchHtml(r,esc);assert(html.includes('screen-slide-text'));assert(html.includes('Texto do slide'));assert(!html.includes('Quarteto &lt;Teste&gt;'));assert(!html.includes('screen-bracket with-next'));assert(!html.includes('TEMPO RESTANTE'));
});
