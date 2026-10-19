export const traits=['Observador','Detalhista','Criativo','Raciocínio lógico'];
export function profile(answers){
 if(!Array.isArray(answers)||answers.length!==5||answers.some(x=>!Number.isInteger(x)||x<0||x>3))throw new Error('Responda às cinco perguntas.');
 const scores=[0,0,0,0];answers.forEach(x=>scores[x]++);
 return {scores,trait:scores.indexOf(Math.max(...scores))};
}
export function aggregate(room){const counts=[0,0,0,0]; const people=Object.values(room.people);people.forEach(p=>{if(p.profile)counts[p.profile.trait]++});return {participants:people.length,completed:people.filter(p=>p.answer).length,profiles:counts,teams:people.filter(p=>p.profile).length};}
export function publicRoom(r){return {pin:r.pin,name:r.name,mode:r.mode,status:r.status,endsAt:r.endsAt,nextAt:r.nextAt,demo:!!r.demo,...aggregate(r)};}
