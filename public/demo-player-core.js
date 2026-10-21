import {initTournament,controlTournament,eligible,extraQuestion} from './tournament-core.js';
import {runDemoBots} from './demo-bots.js';

export function createPlayerDemo(items){
 const names=['Quarteto Conexão','Órbita Azul','Horizonte','Constelação','Exploradores','Estrela Norte','Galáxia','Universo'];
 const teams=Object.fromEntries(names.map((name,i)=>{
  const id='player-demo-'+i;
  return [id,{id,name,members:Array.from({length:4},(_,j)=>({name:i===0&&j===0?'Você':`Bot ${i*4+j+1}`,bot:!(i===0&&j===0)}))}];
 }));
 const room={demo:true,playerTeamId:'player-demo-0',name:'Você e três bots',chapter:'Runaway · Produção e consumo',pin:'888888',playerCode:'000001',teams,items:structuredClone(items),answers:{},observations:[],status:'ready',index:-1,revealed:false,openedAt:null,endsAt:null};
 initTournament(room);return room;
}

// Returns whether the page needs to render. Never submits for the human team.
export function stepPlayerDemo(room,now=Date.now(),random=Math.random){
 if(!room.demo||!room.playerTeamId||room.status!=='active')return false;
 if(room.revealed){
  room.demoNextAt??=now+4000;
  if(now<room.demoNextAt)return false;
  if(room.tournament.phase==='tiebreak'&&room.tournament.bank[room.tournament.tieCursor]===undefined){
   const item=room.items.find(x=>x.type==='quiz');
   extraQuestion(room,{...structuredClone(item),title:'Desempate extra · '+item.title});
  }
  controlTournament(room,room.tournament.phase==='round-complete'?'advance-round':'next',now);
  delete room.demoNextAt;
 }
 if(!room.openedAt){controlTournament(room,'open',now);return true;}
 const changed=runDemoBots(room,now,random,room.playerTeamId)>0;
 const ids=Object.keys(room.teams).filter(id=>eligible(room,id));
 const allAnswered=ids.length>0&&ids.every(id=>room.answers[room.index]?.[id]);
 if(allAnswered||now>=room.endsAt){controlTournament(room,'reveal',now);room.demoNextAt=now+4000;return true;}
 return changed;
}
