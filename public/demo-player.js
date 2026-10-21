import {createPlayerDemo,stepPlayerDemo} from './demo-player-core.js';
import {controlTournament,tournamentView,tournamentAnswer} from './tournament-core.js';

export function startPlayerDemo(app,{sample,itemHtml,notice,esc}){
 const key='slarklive-one-player-demo-v1';let room;
 try{room=JSON.parse(sessionStorage.getItem(key));}catch{}
 if(!room?.playerTeamId||!room?.playerCode)room=createPlayerDemo(sample());
 function save(){sessionStorage.setItem(key,JSON.stringify(room));}
 function render(){
  save();const tournament=tournamentView(room,room.playerTeamId),x=room.items[room.index];
  const item=x?(room.revealed?x:Object.fromEntries(Object.entries(x).filter(([k])=>!['correct','explanation'].includes(k)))):null;
  const state={...room,item,tournament,total:room.items.length,answered:!!room.answers[room.index]?.[room.playerTeamId]};
  const eliminated=tournament.own.status==='eliminated';
  app.innerHTML=`<div class="demo-status"><span class="badge">TESTE · 1 PESSOA E 31 BOTS</span><h2>Você está no Quarteto Conexão.</h2><div class="card"><p>Para entrar neste teste pela página inicial:</p><p><strong>PIN de teste: ${esc(room.pin)}</strong><br><strong>Código do seu quarteto: ${esc(room.playerCode)}</strong></p><a class="button secondary" href="/?pin=${esc(room.pin)}">Ir à entrada para digitar meu código →</a></div><p>Você envia a resposta coletiva do seu quarteto. Os outros sete quartetos são formados por bots. Perguntas, resultados e fases avançam automaticamente. Este teste usa apenas dados fictícios nesta aba.</p><div class="row">${room.teams[room.playerTeamId].members.map(m=>`<span class="badge">${esc(m.name)}${m.bot?' · companheiro bot':''}</span>`).join('')}</div><p>Seu quarteto nesta fase: <strong>${esc(tournament.own.label)}</strong></p>${eliminated?'<p class="badge">Seu quarteto foi eliminado. Acompanhe os bots até a final ou tente novamente.</p>':''}${room.status==='ready'?'<button id="startPlayer">Começar meu teste →</button>':''}<button id="restartPlayer" class="secondary">Reiniciar teste</button></div>${room.status==='ready'?'<div class="card"><h2>Como jogar</h2><p>Escolha uma alternativa antes do cronômetro acabar. Cada fase tem cinco perguntas. O quarteto com mais acertos avança; empates são decididos com perguntas extras. Seu grupo aparece destacado no chaveamento.</p></div>':`<section class="card presentation">${itemHtml(state,true)}${room.revealed&&room.status==='active'?'<p class="muted">Confira a resposta. O teste continua em alguns segundos…</p>':''}</section>`}`;
  document.querySelector('#startPlayer')?.addEventListener('click',()=>{controlTournament(room,'start');stepPlayerDemo(room);render();});
  document.querySelector('#restartPlayer').onclick=()=>{if(confirm('Reiniciar o teste com um novo sorteio?')){room=createPlayerDemo(sample());render();}};
  document.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>{try{tournamentAnswer(room,room.teams[room.playerTeamId],Number(b.dataset.option));render();}catch(e){notice(e.message)}});
  clock();
 }
 function clock(){const node=document.querySelector('#clock');if(node)node.textContent=room.endsAt&&!room.revealed?Math.max(0,Math.ceil((room.endsAt-Date.now())/1000))+'s':'';}
 render();setInterval(()=>{try{if(stepPlayerDemo(room))render();else clock();}catch(e){notice(e.message)}},250);
}
