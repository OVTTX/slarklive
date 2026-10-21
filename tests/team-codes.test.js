import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixedTeamCode} from '../api/team-codes.js';
import {summary} from '../api/domain.js';
import {initTournament,controlTournament} from '../api/tournament.js';

test('código acompanha o ID do quarteto entre salas, professores e renomeações',()=>{
 const state={rooms:{}};const team={id:'time-slark-1',name:'Universo'};
 assert.equal(fixedTeamCode(state,team,false,()=> '123456'),'123456');
 assert.equal(fixedTeamCode(state,{...team,name:'Novo nome'},false,()=>{throw Error('Não deve sortear novamente')}),'123456');
 assert.equal(state.quartetCodes.slark[team.id].name,'Novo nome');
 const restored=JSON.parse(JSON.stringify(state));assert.equal(fixedTeamCode(restored,team),'123456');
});
test('IDs distintos não compartilham código mesmo com o mesmo nome; demo tem registro separado',()=>{
 const state={};fixedTeamCode(state,{id:'a',name:'Órbita'},false,()=> '123456');
 const candidates=['123456','654321'];assert.equal(fixedTeamCode(state,{id:'b',name:'Órbita'},false,()=>candidates.shift()),'654321');
 assert.equal(fixedTeamCode(state,{id:'a',name:'Bot'},true,()=> '222222'),'222222');
 assert.equal(state.quartetCodes.slark.a.code,'123456');
});
test('recepção revela somente nomes conectados; primeira fase mantém confrontos anônimos',()=>{
 const room={pin:'999999',name:'Teste',chapter:'1',status:'ready',items:Array.from({length:5},()=>({type:'quiz',correct:0,seconds:30})),index:-1,answers:{},teams:{a:{id:'a',name:'Universo',token:'token-secreto',code:'123456',members:[{name:'Pessoa privada'}]},b:{id:'b',name:'Órbita',token:null,code:'654321',members:[]}}};initTournament(room,m=>m-1);
 const lobby=summary(room);assert.deepEqual(lobby.lobbyTeams,[{name:'Universo'}]);
 const raw=JSON.stringify(lobby);for(const secret of ['token-secreto','123456','Pessoa privada','654321'])assert(!raw.includes(secret));
 controlTournament(room,'start');const live=summary(room);assert.equal(live.lobbyTeams,undefined);assert(!JSON.stringify(live).includes('Universo'));assert(!JSON.stringify(live).includes('Órbita'));
});
