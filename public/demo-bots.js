import {eligible,tournamentAnswer} from './tournament-core.js';

// Demo only: the real rooms never import or call this simulation.
export function runDemoBots(room,now=Date.now(),random=Math.random,excludeTeamId=null){
 if(!room.demo||room.status!=='active'||room.tournament?.phase!=='question'||!room.openedAt||room.revealed||now>=room.endsAt)return 0;
 const key=`${room.tournament.round}:${room.index}:${room.openedAt}`;
 if(room.demoBots?.key!==key){
  const window=Math.max(0,Math.min(8000,room.endsAt-room.openedAt-500));
  room.demoBots={key,plans:Object.values(room.teams).filter(t=>t.id!==excludeTeamId&&eligible(room,t.id)).map((t,i)=>{
   const correct=room.items[room.index].correct;
   const option=random()<0.5+(i%5)*0.08?correct:(correct+1+Math.floor(random()*3))%4;
   return {id:t.id,option,at:room.openedAt+window*(0.2+random()*0.8)};
  })};
 }
 let count=0;
 for(const plan of room.demoBots.plans){
  if(plan.id===excludeTeamId||now<plan.at||room.answers[room.index]?.[plan.id]||!eligible(room,plan.id))continue;
  tournamentAnswer(room,room.teams[plan.id],plan.option,now);count++;
 }
 return count;
}
