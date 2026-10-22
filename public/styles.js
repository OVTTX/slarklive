import {CATALOGO,PADRAO,podeUsar} from './style-catalog.js';
export function applyStyle(preferencias=PADRAO){
 for(const key of ['skin','texto','moldura'])document.documentElement.dataset[key]=preferencias[key]||PADRAO[key];
}
export async function startStyles(app,{api,esc,notice}){
 const session=await api('session');if(!session.authenticated){location.href='/login?next=/estilos';return;}
 let state=await api('styles'),preview={...state.preferencias},tipo='skin',busy=false;
 const categories=[['skin','Temas'],['texto','Cores de títulos'],['moldura','Molduras']];
 const number=n=>n.toLocaleString('pt-BR');
 applyStyle(state.preferencias);
 app.innerHTML=`<section class="style-shop"><div class="row spread"><a class="button secondary" href="/inicio">← Meu início</a><span class="badge">${state.completo?'Acervo completo · VTX e admins':number(state.vitorias)+' vitórias'}</span></div><div class="eyebrow">Seu universo, do seu jeito</div><h1>Conquiste.<br>Desbloqueie. Personalize.</h1><p>Seus confrontos vencidos no Live Room abrem novas possibilidades. As vitórias são de cada integrante do quarteto e nunca são gastas.</p>${state.completo?'<p class="style-access">✦ Todos os estilos já estão liberados para sua conta. Nenhuma vitória necessária.</p>':'<p class="muted">Vitórias validadas no mata-mata. Demonstrações, bots e avanços sem adversário não entram na contagem. Slark Gold com 25 vitórias.</p>'}<div id="stylePreview" aria-label="Prévia do visual"></div><div class="row style-categories" aria-label="Categorias de estilos">${categories.map(([key,label])=>`<button type="button" data-category="${key}" aria-pressed="${tipo===key}" class="secondary">${label}</button>`).join('')}</div><div id="styleCatalog" class="style-catalog"></div><p id="styleStatus" role="status" aria-live="polite"></p></section>`;
 function drawPreview(){
  const theme=CATALOGO.find(i=>i.tipo==='skin'&&i.id===preview.skin),gold=preview.skin==='ouro',noir=preview.skin==='noir';
  const text=noir?'#D1D1D1':preview.texto==='padrao'?(gold?'#332A19':'#fff'):gold?'#805B13':CATALOGO.find(i=>i.tipo==='texto'&&i.id===preview.texto).cor;
  document.querySelector('#stylePreview').innerHTML=`<div class="skin-preview" style="background:${theme.fundo};color:${noir?'#D1D1D1':gold?'#332A19':'#fff'};border-color:${theme.cor}66"><small style="color:${theme.cor}">PRÉVIA · ${esc(theme.nome.toUpperCase())}</small><div class="row"><span class="style-avatar frame-${preview.moldura}" style="color:${theme.cor}">S</span><div><h2 style="color:${text}">Cada vitória abre um universo.</h2><p style="color:inherit">Um novo visual para as suas próximas conexões.</p></div></div><small style="color:inherit">Só muda no seu aplicativo quando você aplica um estilo.</small></div>`;
 }
 function drawCatalog(){
  document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===tipo)));
  document.querySelector('#styleCatalog').innerHTML=CATALOGO.filter(i=>i.tipo===tipo).map(item=>{
   const active=state.preferencias[tipo]===item.id,unlocked=podeUsar(item,state.vitorias,state.completo);
   return `<article class="card style-product ${active?'style-active':''}"><div class="style-swatch" aria-hidden="true" style="background:${item.fundo||'#10102C'};color:${item.cor}">${tipo==='moldura'?`<span class="style-avatar frame-${item.id}">S</span>`:'<span>Aa</span>'}</div><h2>${esc(item.nome)} ${active?'✓':''}</h2><p>${esc(item.descricao|| (tipo==='texto'?'Dê uma nova cor aos seus títulos.':'Um detalhe para destacar seu avatar.'))}</p><small>${state.completo?'Liberado para sua conta':item.vitorias===0?'Disponível desde o começo':number(item.vitorias)+' vitórias para desbloquear'}</small><button type="button" class="secondary" data-preview="${item.id}" aria-label="Ver prévia de ${esc(item.nome)}">Ver prévia</button><button type="button" data-use="${item.id}" aria-label="${active?'Em uso':unlocked?'Usar':'Bloqueado:'} ${esc(item.nome)}" ${active||!unlocked||busy?'disabled':''}>${active?'Em uso':!unlocked?'Faltam '+number(item.vitorias-state.vitorias)+' vitórias':busy?'Salvando…':'Usar estilo'}</button></article>`;
  }).join('');
  document.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>{preview={...preview,[tipo]:b.dataset.preview};drawPreview();document.querySelector('#styleStatus').textContent='Prévia de '+CATALOGO.find(i=>i.tipo===tipo&&i.id===b.dataset.preview).nome;});
  document.querySelectorAll('[data-use]').forEach(b=>b.onclick=async()=>{
   if(busy)return;busy=true;const key=tipo,id=b.dataset.use;drawCatalog();
   try{state=await api('styles',{tipo:key,id});preview={...state.preferencias};applyStyle(state.preferencias);drawPreview();document.querySelector('#styleStatus').textContent='Estilo aplicado e salvo na sua conta.';}catch(e){notice(e.message);document.querySelector('#styleStatus').textContent=e.message;}finally{busy=false;drawCatalog();document.querySelector(`[data-preview="${id}"]`)?.focus();}
  });
 }
 document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{if(busy)return;tipo=b.dataset.category;drawCatalog();});
 drawPreview();drawCatalog();
}
