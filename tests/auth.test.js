import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
test('mesmo login Supabase: aceita admin e professor, rejeita aluno e credenciais inválidas',async()=>{
 let role='admin_slark';const id='11111111-1111-1111-1111-111111111111';
 const backend=http.createServer(async(req,res)=>{res.setHeader('Content-Type','application/json');if(req.url.startsWith('/auth/v1/token')){let s='';for await(const c of req)s+=c;const b=JSON.parse(s);if(b.password!=='existing-password'){res.writeHead(400);return res.end('{}');}return res.end(JSON.stringify({user:{id},access_token:'valid-user-token'}));}if(req.headers.authorization!=='Bearer valid-user-token'){res.writeHead(401);return res.end('{}');}if(req.url==='/auth/v1/user')return res.end(JSON.stringify({id}));if(req.url.startsWith('/rest/v1/usuarios'))return res.end(JSON.stringify([{id,perfil:role,nome:'Conta teste',escola_id:null}]));res.end('[]');});
 backend.listen(0,'127.0.0.1');await once(backend,'listening');const port=44000+Math.floor(Math.random()*10000);const server=spawn(process.execPath,[new URL('../server.js',import.meta.url).pathname],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),SUPABASE_URL:`http://127.0.0.1:${backend.address().port}`,SUPABASE_PUBLISHABLE_KEY:'public-test-key',SESSION_SECRET:'s'.repeat(48),ENABLE_DEMO:'',VERCEL:''},stdio:['ignore','pipe','pipe']});
 try{await once(server.stdout,'data');const login=()=>fetch(`http://localhost:${port}/api?action=login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'existing@example.com',password:'existing-password'})});
 for(const r of ['admin_slark','professor','diretor']){role=r;const response=await login();assert.equal(response.status,200);const cookies=response.headers.getSetCookie();assert(cookies.some(x=>x.startsWith('slark_access=')));assert(cookies.every(x=>x.includes('HttpOnly')));}
 role='aluno';assert.equal((await login()).status,403);
 const invalid=await fetch(`http://localhost:${port}/api?action=login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'existing@example.com',password:'incorrect'})});assert.equal(invalid.status,401);
 }finally{server.kill();await once(server,'exit');await new Promise(resolve=>backend.close(resolve));}
});
