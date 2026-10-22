import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
test('mesmo login Supabase: aceita perfis Slark e separa aluno da administração',async()=>{
 let role='admin_slark',name='Conta teste',savedStyle=null,saveFailure=false;const id='11111111-1111-1111-1111-111111111111';
 const backend=http.createServer(async(req,res)=>{res.setHeader('Content-Type','application/json');if(req.url.startsWith('/auth/v1/token')){let s='';for await(const c of req)s+=c;const b=JSON.parse(s);if(b.password!=='existing-password'){res.writeHead(400);return res.end('{}');}return res.end(JSON.stringify({user:{id},access_token:'valid-user-token'}));}if(req.headers.authorization!=='Bearer valid-user-token'){res.writeHead(401);return res.end('{}');}if(req.url==='/auth/v1/user')return res.end(JSON.stringify({id}));if(req.url.startsWith('/rest/v1/personalizacoes_slarklive')){if(req.method==='POST'){let raw='';for await(const chunk of req)raw+=chunk;const next=JSON.parse(raw);assert.equal(next.usuario_id,id);assert.match(req.headers.prefer,/resolution=merge-duplicates/);if(saveFailure){res.writeHead(503);return res.end('{}');}savedStyle=next;}return res.end(JSON.stringify(savedStyle?[savedStyle]:[]));}if(req.url.startsWith('/rest/v1/usuarios'))return res.end(JSON.stringify([{id,perfil:role,nome:name,escola_id:null}]));res.end(req.url.startsWith('/rest/v1/rpc/slarklive_minhas_vitorias')?'0':'[]');});
 backend.listen(0,'127.0.0.1');await once(backend,'listening');const port=44000+Math.floor(Math.random()*10000);const server=spawn(process.execPath,[new URL('../server.js',import.meta.url).pathname],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),SUPABASE_URL:`http://127.0.0.1:${backend.address().port}`,SUPABASE_PUBLISHABLE_KEY:'public-test-key',SESSION_SECRET:'s'.repeat(48),ENABLE_DEMO:'',VERCEL:'1',DATABASE_URL:'postgresql://intentionally-unavailable.invalid/db'},stdio:['ignore','pipe','pipe']});
 try{await once(server.stdout,'data');const login=()=>fetch(`http://localhost:${port}/api?action=login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'existing@example.com',password:'existing-password'})});
 for(const r of ['admin_slark','professor','diretor']){role=r;const response=await login();assert.equal(response.status,200);const cookies=response.headers.getSetCookie();assert(cookies.some(x=>x.startsWith('slark_access=')));assert(cookies.every(x=>x.includes('HttpOnly')));}
 role='aluno';const student=await login();assert.equal(student.status,200);assert.equal((await student.json()).redirect,'/aluno');const cookie=student.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');const session=await fetch(`http://localhost:${port}/api?action=session`,{headers:{cookie}});const state=await session.json();assert.equal(state.student,true);assert.equal(state.admin,false);const denied=await fetch(`http://localhost:${port}/api?action=create`,{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:'{}'});assert.equal(denied.status,401);
 const styles=async body=>{const r=await fetch(`http://localhost:${port}/api?action=styles`,{method:body?'POST':'GET',headers:{cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
 assert.equal((await styles()).data.completo,false);
 assert.equal((await styles({tipo:'skin',id:'ouro',wins:99999,completo:true})).status,403);
 name='VTX Teste';assert.equal((await styles()).data.completo,true);
 assert.equal((await styles({tipo:'skin',id:'ouro'})).data.preferencias.skin,'ouro');
 assert.equal((await styles()).data.preferencias.skin,'ouro');
 saveFailure=true;assert.notEqual((await styles({tipo:'skin',id:'rubi'})).status,200);saveFailure=false;assert.equal((await styles()).data.preferencias.skin,'ouro');
 name='Conta teste';assert.equal((await styles()).data.preferencias.skin,'slark');
 const unauth=await fetch(`http://localhost:${port}/api?action=styles`);assert.equal(unauth.status,401);
 const invalid=await fetch(`http://localhost:${port}/api?action=login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'existing@example.com',password:'incorrect'})});assert.equal(invalid.status,401);
 }finally{server.kill();await once(server,'exit');await new Promise(resolve=>backend.close(resolve));}
});
