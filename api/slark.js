import {fail} from './domain.js';
let pool;
export async function sql(query,args=[]){
 if(!process.env.SLARK_DATABASE_URL)fail('Configure SLARK_DATABASE_URL para conectar os quartetos da Slark.',503);
 if(!pool){const {Pool}=await import('pg');pool=new Pool({connectionString:process.env.SLARK_DATABASE_URL,max:3});}
 return (await pool.query(query,args)).rows;
}
export async function teacherInfo(id){const rows=await sql("SELECT id,nome FROM usuarios WHERE id=$1 AND perfil='professor'",[id]);if(!rows[0])fail('Acesso exclusivo de professor da Slark.',403);return rows[0];}
export async function catalog(id){await teacherInfo(id);return await sql("SELECT id,titulo,sala_id FROM trilhas WHERE professor_id=$1 ORDER BY criada_em DESC",[id]);}
export async function loadTeams(id,trailId){
 const trails=await sql('SELECT id,titulo,sala_id FROM trilhas WHERE id=$1 AND professor_id=$2',[trailId,id]);
 if(!trails[0]?.sala_id)fail('Trilha não encontrada, sem turma ou pertencente a outro professor.',403);
 const teams=await sql('SELECT id,nome FROM times WHERE sala_id=$1 ORDER BY nome',[trails[0].sala_id]);
 const members=await sql('SELECT tm.time_id,a.id,a.nome FROM time_membros tm JOIN alunos a ON a.id=tm.aluno_id JOIN times t ON t.id=tm.time_id WHERE t.sala_id=$1 AND a.sala_id=$1',[trails[0].sala_id]);
 const result=teams.map(t=>({id:t.id,name:t.nome,members:members.filter(m=>m.time_id===t.id).map(m=>({id:m.id,name:m.nome}))})).filter(t=>t.members.length===4);
 if(!result.length)fail('Nenhum quarteto de quatro integrantes está definido nesta turma. Organize os times no Slark primeiro.');
 const ids=result.flatMap(t=>t.members.map(m=>m.id));if(new Set(ids).size!==ids.length)fail('Há estudantes em mais de um quarteto. Corrija os times no Slark antes de abrir a sala.');
 return {trail:trails[0],teams:result};
}
export async function saveObservation({teacher,student,text,trailId}){
 const valid=await sql('SELECT a.id FROM alunos a JOIN trilhas t ON t.sala_id=a.sala_id WHERE a.id=$1 AND t.id=$2 AND t.professor_id=$3',[student,trailId,teacher]);
 if(!valid.length)fail('Aluno fora da turma desta trilha.',403);
 const rows=await sql('INSERT INTO observacoes (aluno_id,professor_id,texto) VALUES ($1,$2,$3) RETURNING id',[student,teacher,text]);return rows[0].id;
}
