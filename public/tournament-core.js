function randomInt(max){const limit=Math.floor(4294967296/max)*max;let value;do{value=crypto.getRandomValues(new Uint32Array(1))[0];}while(value>=limit);return value%max;}
const error=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
export function roundName(matches){return ({1:'Final',2:'Semifinal',4:'Quartas de final',8:'Oitavas de final',16:'Dezesseis avos de final'})[matches]||`Fase com ${matches} confrontos`;}
function shuffled(ids,random=randomInt){const result=[...ids];for(let i=result.length-1;i>0;i--){const j=random(i+1);[result[i],result[j]]=[result[j],result[i]];}return result;}
function pairRound(ids,initial=false){
 if(!initial)return Array.from({length:ids.length/2},(_,i)=>({a:ids[i*2],b:ids[i*2+1],winner:null,bye:false}));
 const size=2**Math.ceil(Math.log2(ids.length)),byes=size-ids.length,matches=[];let cursor=0;
 for(let i=0;i<byes;i++){const id=ids[cursor++];matches.push({a:id,b:null,winner:id,bye:true});}
 while(cursor<ids.length)matches.push({a:ids[cursor++],b:ids[cursor++],winner:null,bye:false});
 return matches;
}
export function initTournament(room,random){
 const ids=Object.keys(room.teams);if(ids.length<2||ids.length>64)error('O mata-mata precisa de 2 a 64 quartetos.');
 const count=Math.ceil(Math.log2(ids.length));const bank=room.items.flatMap((x,i)=>x.type==='quiz'?[i]:[]);
 if(bank.length<count*5)error(`Para ${ids.length} quartetos, prepare pelo menos ${count*5} perguntas: cinco por fase (${count} fases). Perguntas extras servem para desempates.`);
 const order=shuffled(ids,random);room.tournament={round:0,roundCount:count,rounds:[pairRound(order,true)],bank,baseCount:count*5,tieCursor:count*5,question:0,phase:'waiting',revealedItems:[],champion:null,aliases:Object.fromEntries(order.map((id,i)=>[id,`Quarteto ${String(i+1).padStart(2,'0')}`]))};
}
const activeMatches=room=>room.tournament.rounds[room.tournament.round];
export function matchFor(room,id){return activeMatches(room).find(m=>m.a===id||m.b===id);}
export function eligible(room,id){const m=matchFor(room,id);return !!m&&!m.winner&&!m.bye;}
export function teamLabel(room,id){if(!id)return 'Aguardando adversário';const t=room.tournament;return t.round===0&&t.phase!=='completed'?t.aliases[id]:room.teams[id].name;}
function resetQuestion(room,index){room.index=index;room.nextQuestionAt=null;room.revealed=false;room.openedAt=null;room.endsAt=null;room.tournament.phase='question';}
function score(room,match){return [match.a,match.b].map(id=>room.tournament.bank.slice(room.tournament.round*5,room.tournament.round*5+5).reduce((n,index)=>n+(room.answers[index]?.[id]?.correct?1:0),0));}
export function tournamentView(room,ownId){const t=room.tournament;return {round:t.round+1,roundCount:t.roundCount,roundLabel:roundName(activeMatches(room).length),phase:t.phase,question:Math.min(t.question+1,5),tiebreak:t.question>=5,hidden:t.round===0&&t.phase!=='completed',champion:t.champion?teamLabel(room,t.champion):null,history:t.rounds.map((matches,i)=>({label:roundName(matches.length),matches:matches.map((m,j)=>{const scores=scoreForRound(room,m,i);return {slot:j+1,a:teamLabel(room,m.a),b:m.b?teamLabel(room,m.b):'Avança sem adversário',scoreA:scores[0],scoreB:scores[1],winner:m.winner?teamLabel(room,m.winner):null,bye:m.bye,own:!!ownId&&(m.a===ownId||m.b===ownId)};})})),own:ownId?{label:teamLabel(room,ownId),eligible:eligible(room,ownId),status:t.champion===ownId?'champion':matchFor(room,ownId)?.winner===ownId?'qualified':eligible(room,ownId)?'playing':'eliminated'}:null};}
function scoreForRound(room,m,round){return [m.a,m.b].map(id=>room.tournament.bank.slice(round*5,round*5+5).reduce((n,index)=>n+(room.tournament.revealedItems.includes(index)&&room.answers[index]?.[id]?.correct?1:0),0));}
export function tournamentAnswer(room,team,option,now=Date.now()){
 if(!eligible(room,team.id))error('Seu quarteto não está disputando esta pergunta.',403);
 if(room.status!=='active'||room.tournament.phase!=='question'||!room.openedAt||room.revealed||now>=room.endsAt)error('Esta pergunta não está aberta.');
 if(!Number.isInteger(option)||option<0||option>3)error('Alternativa inválida.');
 room.answers[room.index]??={};if(room.answers[room.index][team.id])error('Seu quarteto já respondeu.',409);
 room.answers[room.index][team.id]={option,elapsedMs:now-room.openedAt,correct:option===room.items[room.index].correct};
}
function resolveAfterReveal(room){
 const t=room.tournament;if(t.question<4)return;
 for(const m of activeMatches(room)){
 if(m.winner)continue;
 if(t.question===4){const [a,b]=score(room,m);if(a!==b)m.winner=a>b?m.a:m.b;}
 else{const a=!!room.answers[room.index]?.[m.a]?.correct,b=!!room.answers[room.index]?.[m.b]?.correct;if(a!==b)m.winner=a?m.a:m.b;}
 }
 if(activeMatches(room).every(m=>m.winner)){
 if(activeMatches(room).length===1){t.champion=activeMatches(room)[0].winner;t.phase='completed';room.status='closed';}
 else t.phase='round-complete';
 }else if(t.question>=4)t.phase='tiebreak';
}
export function controlTournament(room,command,now=Date.now()){
 const t=room.tournament;
 if(command==='start'){
 if(room.status!=='ready')error('O torneio já foi iniciado.');room.status='active';t.phase='question';resetQuestion(room,t.bank[0]);return;
 }
 if(command==='close'){room.status='closed';t.phase='cancelled';room.endsAt=null;return;}
 if(room.status!=='active')error('O torneio não está em andamento.');
 if(command==='advance-round'){
 if(t.phase!=='round-complete')error('Conclua os confrontos e desempates antes de avançar.');
 const winners=activeMatches(room).map(m=>m.winner);t.round++;t.rounds.push(pairRound(winners));t.question=0;resetQuestion(room,t.bank[t.round*5]);return;
 }
 if(command==='open'){
 if(t.phase!=='question'||room.openedAt||room.revealed)error('A pergunta não pode ser aberta novamente.');room.openedAt=now;room.endsAt=now+room.items[room.index].seconds*1000;return;
 }
 if(command==='reveal'){
 if(t.phase!=='question'||!room.openedAt||room.revealed)error('Abra uma pergunta antes de revelar a resposta.');room.revealed=true;room.nextQuestionAt=now+20000;t.revealedItems.push(room.index);room.endsAt=Math.min(room.endsAt,now);resolveAfterReveal(room);return;
 }
 if(command==='next'){
 if(!room.revealed)error('Revele a resposta antes de avançar.');
 if(t.phase==='round-complete')error('Avance a fase pelo controle do chaveamento.');
 if(t.question<4){t.question++;resetQuestion(room,t.bank[t.round*5+t.question]);return;}
 if(t.phase!=='tiebreak')error('Não há desempate pendente.');
 const index=t.bank[t.tieCursor];if(index===undefined)error('Adicione uma pergunta extra para desempatar.');t.tieCursor++;t.question++;resetQuestion(room,index);return;
 }
 error('Comando inválido para o torneio.');
}
export function extraQuestion(room,item){
 const t=room.tournament;if(room.status!=='active'||t.phase!=='tiebreak')error('Não há desempate aguardando pergunta extra.');
 if(t.bank[t.tieCursor]!==undefined)error('Ainda há perguntas extras disponíveis no banco.');
 room.items.push(item);t.bank.push(room.items.length-1);
}
