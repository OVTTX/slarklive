import {randomInt} from 'node:crypto';

// Called inside the same database transaction that creates the room.
export function fixedTeamCode(state,team,demo=false,generate=()=>String(randomInt(100000,1000000))){
 state.quartetCodes??={};
 const namespace=demo?'demo':'slark';
 const registry=state.quartetCodes[namespace]??={};
 let record=registry[team.id];
 if(!record){
  const used=new Set(Object.values(registry).map(x=>x.code));
  if(used.size>=900000)throw Error('Não há códigos de quarteto disponíveis.');
  let code;do{code=generate();}while(used.has(code));
  record=registry[team.id]={code,name:team.name};
 }
 record.name=team.name;
 return record.code;
}
