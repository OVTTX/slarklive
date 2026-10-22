import {CATALOGO,PADRAO,acessoCompleto,podeUsar,preferenciasValidas} from '../public/style-catalog.js';
import {fail} from './domain.js';
export function styleAction(state,{profile,wins,method,body={}}){
 const completo=acessoCompleto(profile),vitorias=Math.max(0,Math.floor(Number(wins)||0));
 const saved=state.styles?.[profile.id]||PADRAO;
 let preferencias=preferenciasValidas(saved,vitorias,completo);
 if(method==='POST'){
  const item=CATALOGO.find(i=>i.tipo===body.tipo&&i.id===body.id);
  if(!item)fail('Estilo não encontrado.');
  if(!podeUsar(item,vitorias,completo))fail('Você ainda não tem vitórias suficientes para este estilo.',403);
  preferencias={...preferencias,[item.tipo]:item.id};
  state.styles??={};state.styles[profile.id]=preferencias;
 }
 return {vitorias,completo,preferencias};
}
