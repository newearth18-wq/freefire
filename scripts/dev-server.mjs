import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {api} from '../server/worker.mjs';
import {localDatabase} from './local-db.mjs';
await mkdir('.sites-runtime',{recursive:true});const DB=await localDatabase('.sites-runtime/rooms.sqlite');
const root=path.resolve('public'),port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.glb':'model/gltf-binary','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1:'+port);
 if(url.pathname==='/__preview'){
  const size=(key,fallback,min,max)=>Math.max(min,Math.min(max,Number(url.searchParams.get(key))||fallback)),width=size('width',844,200,1600),height=size('height',390,250,1200);
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end('<!doctype html><html><title>Device preview</title><body style="background:#19242b;color:white;font:14px sans-serif;margin:20px"><p>LAST ISLAND · '+width+' × '+height+'</p><iframe id="device" title="Game device preview" src="/" width="'+width+'" height="'+height+'" style="border:0;display:block" allow="autoplay;fullscreen"></iframe></body></html>');return;
 }
 if(url.pathname.startsWith('/api/rooms/')){let body='';for await(const chunk of req){body+=chunk;if(body.length>12000){res.writeHead(413);res.end();return}}const response=await api(new Request(url,{method:req.method,headers:req.headers,body:body||undefined}),{DB});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return}
 const pathname=decodeURIComponent(url.pathname),target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 const data=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data)
}catch(error){res.writeHead(404);res.end('Not found')}});
server.listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port));
