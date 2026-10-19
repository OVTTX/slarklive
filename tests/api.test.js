import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
test('jornada completa, autorização, vaga única e devolutiva',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'slarklive-'));const port=32000+Math.floor(Math.random()*10000);
 const child=spawn(process.execPath,[new URL('../server.js',import.meta.url).pathname],{cwd:dir,env:{...process.env,PORT:String(port),DATABASE_URL:'',VERCEL:'',ADMIN_PASSWORD:'test-password',SESSION_SECRET:'x'.repeat(48)},stdio:['ignore','pipe','pipe']});
 try{await once(child.stdout,'data');let cookie='';const call=async(action,data,auth=false,query={})=>{const r=await fetch(`http://localhost:${port}/api?`+new URLSearchParams({action,...query}),{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json'}:{}),...(auth?{cookie}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};};
 assert.equal((await call('create',{})).status,401);assert.equal((await call('login',{password:'wrong'})).status,401);
 const login=await call('login',{password:'test-password'});assert.equal(login.status,200);cookie=login.cookie.split(';')[0];
 const c=await call('create',{mode:'evaluator',minutes:25},true);const pin=c.data.pin;assert.match(pin,/^\d{6}$/);
 assert.equal((await call('join',{pin})).status,400);await call('control',{pin,command:'start'},true);
 const concurrent=await Promise.all([call('join',{pin}),call('join',{pin})]);assert.deepEqual(concurrent.map(x=>x.status).sort(),[200,400]);const token=concurrent.find(x=>x.status===200).data.token;
 assert.equal((await call('submissions',null,false,{pin})).status,401);
 assert.equal((await call('profile',{pin,token,answers:[2,2,2,1,0]})).status,200);
 const answer='A pecuária fornece leite, mas a seca reduz a merenda. Reservar água com planejamento pode ajudar os produtores.';
 assert.equal((await call('submit',{pin,token,answer})).status,200);
 const stats=await call('room',null,false,{pin});assert.equal(stats.data.completed,1);assert.equal(JSON.stringify(stats.data).includes(answer),false);
 const submissions=await call('submissions',null,true,{pin});assert.equal(submissions.data[0].answer,answer);
 await call('control',{pin,command:'review',person:token,review:'Boa relação entre produção e merenda.'},true);
 assert.equal((await call('me',null,false,{pin,token})).data.review,'Boa relação entre produção e merenda.');
 await call('control',{pin,command:'close'},true);assert.equal((await call('submit',{pin,token,answer})).status,400);
 await call('control',{pin,command:'reset'},true);assert.equal((await call('me',null,false,{pin,token})).status,401);
 }finally{child.kill();await once(child,'exit');await rm(dir,{recursive:true,force:true});}
});
