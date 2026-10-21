import {AsyncLocalStorage} from 'node:async_hooks';
import {fail} from './domain.js';
const context=new AsyncLocalStorage();
export const withSlarkSession=(token,fn)=>context.run(token,fn);
function credentials(){if(!process.env.SUPABASE_URL||!process.env.SUPABASE_PUBLISHABLE_KEY)fail('Autenticação da Slark não configurada.',503);const token=context.getStore();if(!token)fail('Entre novamente com sua conta da Slark.',401);return {apikey:process.env.SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'};}
async function rest(table,query={},method='GET',body){
 const url=new URL(process.env.SUPABASE_URL+'/rest/v1/'+table);for(const [k,v] of Object.entries(query))url.searchParams.set(k,String(v));
 const r=await fetch(url,{method,headers:{...credentials(),Prefer:'return=representation'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});const data=await r.json();if(!r.ok)fail(r.status===401?'Sua sessão expirou. Entre novamente.':'Sua conta não tem permissão para esta operação na Slark.',r.status===401?401:403);return data;
}
export async function accountInfo(id){
 const r=await fetch(process.env.SUPABASE_URL+'/auth/v1/user',{headers:credentials(),signal:AbortSignal.timeout(10000)});const user=await r.json();if(!r.ok||user.id!==id)fail('Sessão da Slark inválida ou expirada.',401);
 const rows=await rest('usuarios',{select:'id,nome,perfil,escola_id,ativo,avatar_url',id:'eq.'+id});const p=rows[0];if(!p||p.ativo===false||!['aluno','professor','admin_slark','diretor'].includes(p.perfil))fail('Perfil sem acesso ao Slark Live.',403);return p;
}
export async function catalog(id){const user=await teacherInfo(id);const q={select:'id,titulo,sala_id',order:'criada_em.desc'};if(user.perfil==='professor')q.professor_id='eq.'+id;if(user.perfil==='diretor'){if(!user.escola_id)fail('Conta sem escola vinculada.',403);q.escola_id='eq.'+user.escola_id;}return rest('trilhas',q);}
async function trailFor(id,trailId){const available=await catalog(id);const trail=available.find(t=>t.id===trailId);if(!trail?.sala_id)fail('Trilha fora do seu acesso ou sem turma.',403);return trail;}
export async function loadTeams(id,trailId){
 const trail=await trailFor(id,trailId);const teams=await rest('times',{select:'id,nome',sala_id:'eq.'+trail.sala_id});
 if(!teams.length)fail('Defina os quartetos da turma na Slark primeiro.');
 const members=await rest('time_membros',{select:'time_id,alunos(id,nome,sala_id)',time_id:'in.('+teams.map(t=>t.id).join(',')+')'});
 const result=teams.map(t=>({id:t.id,name:t.nome,members:members.filter(m=>m.time_id===t.id&&m.alunos?.sala_id===trail.sala_id).map(m=>({id:m.alunos.id,name:m.alunos.nome}))})).filter(t=>t.members.length===4);
 if(!result.length)fail('Nenhum quarteto de quatro integrantes está definido na turma ou visível para sua conta.');
 const ids=result.flatMap(t=>t.members.map(m=>m.id));if(new Set(ids).size!==ids.length)fail('Há estudantes em mais de um quarteto. Corrija os times na Slark.');return {trail,teams:result};
}
export async function saveObservation({teacher,student,text,trailId}){
 const trail=await trailFor(teacher,trailId);const students=await rest('alunos',{select:'id',id:'eq.'+student,sala_id:'eq.'+trail.sala_id});if(!students.length)fail('Aluno fora da turma.',403);
 const rows=await rest('observacoes',{},'POST',{aluno_id:student,professor_id:teacher,texto:text});return rows[0].id;
}

export async function teacherInfo(id){const user=await accountInfo(id);if(user.perfil==='aluno')fail('Acesso exclusivo da equipe pedagógica.',403);return user;}
export async function studentCatalog(id){
 const user=await accountInfo(id);if(user.perfil!=='aluno')return catalog(id);
 const rows=await rest('alunos',{select:'id,sala_id',usuario_id:'eq.'+id});
 const classrooms=[...new Set(rows.map(x=>x.sala_id).filter(Boolean))];
 if(!classrooms.length)return [];
 return rest('trilhas',{select:'id,titulo,sala_id',sala_id:'in.('+classrooms.join(',')+')',order:'criada_em.desc'});
}
