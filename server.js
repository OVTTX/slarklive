import http from 'node:http';
import {readFile} from 'node:fs/promises';
import handler from './api/index.js';
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html'};
http.createServer(async(req,res)=>{if(req.url.startsWith('/api'))return handler(req,res);const path=new URL(req.url,'http://localhost').pathname;const file=path==='/app.js'||path==='/style.css'?path:'/index.html';try{res.setHeader('Content-Type',types[file.slice(file.lastIndexOf('.'))]);res.end(await readFile(new URL('./public'+file,import.meta.url)));}catch{res.writeHead(404);res.end();}}).listen(process.env.PORT||3000,()=>console.log('Slark Live: http://localhost:'+(process.env.PORT||3000)));
