import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateDeck,currentItem,answer,summary,results} from '../api/domain.js';
const quiz={type:'quiz',title:'Qual setor?',options:['Primário','Secundário','Terciário','Outro'],correct:0,seconds:30,explanation:'Pecuária é do setor primário.'};
test('aceita slides, quizzes e modo mesclado; valida alternativas e tempo',()=>{
 for(const items of [[{type:'slide',title:'Aula',text:'Conteúdo'}],[quiz],[{type:'slide',title:'Aula'},quiz]])assert.equal(validateDeck(items).length,items.length);
 for(const items of [[],[{...quiz,correct:4}],[{...quiz,options:['A']}],[{...quiz,seconds:0}]])assert.throws(()=>validateDeck(items));
});
test('gabarito e explicação não vazam antes da revelação',()=>{const r={items:[quiz],index:0,revealed:false};assert.equal(currentItem(r).correct,undefined);assert.equal(currentItem(r).explanation,undefined);r.revealed=true;assert.equal(currentItem(r).correct,0);});
test('uma resposta por quarteto e por pergunta; bloqueia antecipada, tardia e revelada',()=>{
 const r={items:[quiz],index:0,status:'active',openedAt:1000,endsAt:31000,revealed:false,answers:{}};const t={id:'team'};
 answer(r,t,0,2000);assert.throws(()=>answer(r,t,1,3000));assert.equal(r.answers[0].team.correct,true);assert.throws(()=>answer(r,{id:'late'},0,31000));r.revealed=true;assert.throws(()=>answer(r,{id:'revealed'},0,2500));assert.equal(results(r,t)[0].answer.elapsedMs,1000);
});
test('telão exclui membros, códigos de equipe e observações',()=>{const r={items:[quiz],index:0,revealed:false,teams:{team:{name:'Time',token:'secret',code:'private',members:['Pessoa']}},answers:{},observations:['Privado']};const v=JSON.stringify(summary(r));for(const word of ['secret','private','Pessoa','Privado','explanation','correct'])assert.equal(v.includes(word),false);});
