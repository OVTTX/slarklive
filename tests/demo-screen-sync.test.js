import test from 'node:test';
import assert from 'node:assert/strict';
import {startPlayerDemo} from '../public/demo-player.js';

test('telão e jogador compartilham início e pergunta sem depender da aba original',()=>{
 const originals=Object.fromEntries(['location','localStorage','sessionStorage','document','window','setInterval'].map(k=>[k,globalThis[k]]));
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},listeners=[],buttons={};
 try{
  globalThis.localStorage=storage;globalThis.sessionStorage={getItem:()=>null,setItem:()=>{}};
  globalThis.window={addEventListener:(event,fn)=>listeners.push([event,fn])};globalThis.setInterval=()=>0;
  globalThis.document={body:{classList:{add(){}}},querySelector:selector=>selector==='#startPlayer'?{addEventListener:(event,fn)=>buttons.start=fn}:null,querySelectorAll:()=>[]};
  const options={sample:()=>Array.from({length:25},(_,i)=>({type:'quiz',title:'Pergunta '+i,options:['A','B','C','D'],correct:0,seconds:30})),itemHtml:r=>'<h1>'+r.item.title+'</h1>',notice:msg=>{throw Error(msg)},esc:x=>String(x??'')};
  const player={innerHTML:''},screen={innerHTML:''};
  globalThis.location={search:'?mode=player'};startPlayerDemo(player,options);const startFromPlayer=buttons.start;
  globalThis.location={search:'?mode=player&screen=1'};startPlayerDemo(screen,options);
  assert.match(screen.innerHTML,/Iniciar partida/);
  startFromPlayer();
  for(const [event,fn] of listeners)if(event==='storage')fn({key:'slarklive-one-player-demo-v1-shared-room-v2'});
  assert.match(screen.innerHTML,/screen-question-card/);assert.match(player.innerHTML,/Pergunta 0/);
  assert.doesNotMatch(screen.innerHTML,/Clique em Começar/);
 }finally{for(const [k,v] of Object.entries(originals))if(v===undefined)delete globalThis[k];else globalThis[k]=v;}
});
