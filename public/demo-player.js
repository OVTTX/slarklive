import {screenMatchHtml} from './screen-match.js';
import {createPlayerDemo,stepPlayerDemo} from './demo-player-core.js';
import {controlTournament,tournamentView,tournamentAnswer} from './tournament-core.js';

export function startPlayerDemo(app,{sample,itemHtml,notice,esc}){
 const key='slarklive-one-player-demo-v1',sharedKey=key+'-shared-room-v2';
 const screen=new URLSearchParams(location.search).get('screen')==='1';let room,signature='';
 if(screen)document.body.classList.add('live','match-layout');
 function read(){try{const saved=JSON.parse(localStorage.getItem(sharedKey));if(saved?.playerTeamId&&saved?.playerCode)room=saved;}catch{}}
 read();
 if(!room){try{room=JSON.parse(sessionStorage.getItem(key));}catch{}if(!room?.playerTeamId||!room?.playerCode)room=createPlayerDemo(sample());}
 function save(){localStorage.setItem(sharedKey,JSON.stringify(room));sessionStorage.setItem(key,JSON.stringify(room));signature=JSON.stringify(room);}
 function render(){
  save();const tournament=tournamentView(room,room.playerTeamId),x=room.items[room.index];
  const item=x?(room.revealed?x:Object.fromEntries(Object.entries(x).filter(([k])=>!['correct','explanation'].includes(k)))):null;
  const state={...room,item,tournament,total:room.items.length,answered:!!room.answers[room.index]?.[room.playerTeamId]};
  const publicTournament=tournamentView(room);
  const projected={name:room.name,chapter:room.chapter,pin:room.pin,status:room.status,index:room.index,openedAt:room.openedAt,endsAt:room.endsAt,revealed:room.revealed,item,total:room.items.length,tournament:publicTournament,responses:Object.keys(room.answers[room.index]||{}).length,teams:Object.values(room.teams).map(t=>({name:tournamentView(room,t.id).own.label,joined:true,answered:!!room.answers[room.index]?.[t.id]}))};
  if(screen){
   app.innerHTML=room.status==='ready'?`<section class="screen-lobby"><img class="screen-logo" src="/assets/slark-live.svg" alt="Slark Live"><p class="eyebrow">Teste com bots · PIN</p><div class="lobby-pin">${esc(room.pin)}</div><h2>Quarteto Conexão e sete quartetos de bots</h2><p>Você e três bots · Código de teste: 000001</p><button id="startPlayer">Iniciar partida →</button><button id="screenFullscreen" class="secondary">Tela cheia ↗</button></section>`:screenMatchHtml(projected,esc);
   document.querySelector('#startPlayer')?.addEventListener('click',start);
   document.querySelector('#screenFullscreen')?.addEventListener('click',async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen?.();});
   clock();return;
  }
  const eliminated=tournament.own.status==='eliminated';
  app.innerHTML=room.status==='ready'?`<section class="card presentation"><h1>Seu teste está pronto.</h1><div class="row"><a class="button secondary" href="/demo?mode=player&screen=1" target="_blank" rel="noopener">Abrir telão ↗</a><button id="startPlayer">Começar meu teste →</button></div></section>`:room.status==='closed'?`<section class="card presentation"><h1>Partida encerrada.</h1><button id="restartPlayer">Jogar novamente →</button></section>`:eliminated?'<section class="card presentation"><h1>Seu quarteto foi eliminado.</h1><p>Acompanhe o restante da partida no telão.</p></section>':`<section class="card presentation">${itemHtml(state,true)}</section>`;
  document.querySelector('#startPlayer')?.addEventListener('click',start);
  document.querySelector('#restartPlayer')?.addEventListener('click',()=>{if(confirm('Reiniciar o teste com um novo sorteio?')){room=createPlayerDemo(sample());render();}});
  document.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>{try{read();tournamentAnswer(room,room.teams[room.playerTeamId],Number(b.dataset.option));render();}catch(e){notice(e.message)}});
  clock();
 }
 function start(){read();if(room.status==='ready'){controlTournament(room,'start');stepPlayerDemo(room);}render();}
 function clock(){const remaining=room.endsAt&&!room.revealed?Math.max(0,Math.ceil((room.endsAt-Date.now())/1000)):0;const node=document.querySelector('#clock');if(node)node.textContent=node.dataset.format==='minutes'?String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0'):remaining+'s';const bar=document.querySelector('#screenTimeBar');if(bar)bar.style.width=Math.min(100,remaining/(room.items[room.index]?.seconds||30)*100)+'%';}
 render();
 function tick(){try{read();if(stepPlayerDemo(room)||JSON.stringify(room)!==signature)render();else clock();}catch(e){notice(e.message)}}
 window.addEventListener('storage',e=>{if(e.key===sharedKey)tick();});
 window.addEventListener('focus',tick);setInterval(tick,250);
}
