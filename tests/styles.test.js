import test from 'node:test';
import assert from 'node:assert/strict';
import {styleAction} from '../api/styles.js';
import {CATALOGO,PADRAO} from '../public/style-catalog.js';
const call=(state,profile,wins=0,body,extra={})=>styleAction(state,{profile,wins,method:body?'POST':'GET',body,...extra});
test('VTX in verified name or email and Slark admins have every cosmetic at zero wins',()=>{
 for(const profile of [{id:'a',nome:'Conta VtX',perfil:'aluno'},{id:'b',email:'vtx@example.com',perfil:'professor'},{id:'c',perfil:'admin_slark'}]){
  const state={rooms:{}};
  for(const item of CATALOGO){const result=call(state,profile,0,{tipo:item.tipo,id:item.id});assert.equal(result.completo,true);assert.equal(result.preferencias[item.tipo],item.id);}
 }
});
test('all unlock boundaries are enforced by the server and wins cannot be supplied by the browser',()=>{
 const profile={id:'student',perfil:'aluno',nome:'Ana'},state={rooms:{}};
 for(const item of CATALOGO){
  if(item.vitorias)assert.throws(()=>call(state,profile,item.vitorias-1,{tipo:item.tipo,id:item.id,wins:999999,vitorias:999999,completo:true}),e=>e.status===403);
  assert.equal(call(state,profile,item.vitorias,{tipo:item.tipo,id:item.id}).preferencias[item.tipo],item.id);
 }
 assert.throws(()=>call(state,profile,100,{tipo:'skin',id:'inventado'}));
});
test('preferences persist per account and inaccessible saved styles fall back safely',()=>{
 const state={rooms:{}};const vtx={id:'first',nome:'VTX'},other={id:'second',nome:'Ana'};
 call(state,vtx,0,{tipo:'skin',id:'ouro'});assert.equal(call(state,vtx).preferencias.skin,'ouro');
 assert.deepEqual(call(state,other).preferencias,PADRAO);
 assert.equal(call(state,{id:'first',nome:'Ana'}).preferencias.skin,'slark');
 assert.equal(state.styles.first.skin,'ouro');assert.deepEqual(state.rooms,{});
});
test('Gold requires 25 real wins and preview/data does not grant a victory',()=>{
 const state={rooms:{},soloProgress:{student:{fake:{correct:99999}}}};
 assert.throws(()=>call(state,{id:'student'},24,{tipo:'skin',id:'ouro'}),e=>e.status===403);
 assert.equal(call(state,{id:'student'},25,{tipo:'skin',id:'ouro'}).preferencias.skin,'ouro');
 assert.equal(call(state,{id:'student'},0).vitorias,0);
 assert.equal(CATALOGO.filter(i=>i.tipo==='skin').length,12);
});

test('Noir saves and reloads at zero wins for an ordinary account',()=>{
 const state={rooms:{}},profile={id:'noir-student',perfil:'aluno'};
 assert.equal(call(state,profile,0,{tipo:'skin',id:'noir'}).preferencias.skin,'noir');
 assert.equal(call(state,profile,0).preferencias.skin,'noir');
});
