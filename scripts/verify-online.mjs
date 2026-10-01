import assert from 'node:assert/strict';
import {api} from '../server/worker.mjs';
import {localDatabase} from './local-db.mjs';
const DB=await localDatabase();
async function call(op,body,origin='https://test.example'){const response=await api(new Request('https://test.example/api/rooms/'+op,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)}),{DB});return{status:response.status,body:await response.json()}}
const auth=player=>({code:player.code,token:player.token});
async function mutate(code,fn){const row=await DB.prepare('SELECT data FROM rooms WHERE code=?').bind(code).first(),room=JSON.parse(row.data);fn(room);await DB.prepare('UPDATE rooms SET data=? WHERE code=?').bind(JSON.stringify(room),code).run()}
try{
 const look={character:'nova',upper:2,lower:1,feet:0,upperColor:4,hair:3,skin:2,backpack:false};
 const host=(await call('create',{name:'Host',mode:'squad',appearance:look})).body;assert.match(host.code,/^[A-Z2-9]{6}$/);assert.ok(host.token);assert.equal(host.capacity,50);assert.equal(host.teamSize,5);
 const guest=(await call('join',{code:host.code,name:'Friend'})).body,h=auth(host),g=auth(guest);assert.equal(guest.isHost,false);
 assert.equal((await call('start',g)).status,403);assert.equal((await call('poll',{code:host.code,token:'wrong'})).status,401);assert.equal((await call('poll',h,'https://other.example')).status,403);
 const dressed=await call('appearance',{...g,appearance:{character:'ghost',upperColor:999,token:'injected'}});assert.equal(dressed.status,200);const guestLook=dressed.body.players.find(p=>p.id===guest.id).appearance;assert.equal(guestLook.character,'ghost');assert.equal(guestLook.upperColor,0);assert.equal(Object.hasOwn(guestLook,'token'),false);
 for(let i=0;i<3;i++)assert.equal((await call('join',{code:host.code,name:'Ally '+i,team:0})).status,200);
 assert.equal((await call('join',{code:host.code,name:'Overflow',team:0})).status,409,'a squad has exactly five seats');
 assert.equal((await call('team',{...g,team:9})).body.selfTeam,9);assert.equal((await call('team',{...g,team:10})).status,400);
 const launched=await call('start',h);assert.equal(launched.status,200);assert.equal(launched.body.match.entities.length,50);assert.equal(launched.body.match.entities.filter(e=>e.human).length,5);assert.equal(launched.body.match.entities.filter(e=>e.team===9).length,5);assert.equal(launched.body.match.entities.find(e=>e.id===guest.id).team,9);assert.deepEqual(launched.body.match.entities.find(e=>e.id===guest.id).appearance,guestLook);
 assert.equal((await call('start',h)).status,409);assert.equal((await call('team',{...g,team:1})).status,409);assert.equal((await call('appearance',{...g,appearance:look})).status,409);
 assert.equal((await call('join',g)).body.id,guest.id);
 await mutate(host.code,r=>{r.match.drop=0;r.lastTick=Date.now()-250});
 const responses=await Promise.all([call('poll',{...h,controls:{mx:1,yaw:0,actions:[{seq:1,type:'crouch'}]}}),call('poll',{...g,controls:{mx:-1,yaw:0,actions:[{seq:1,type:'swap',index:1}]}})]);assert.ok(responses.every(r=>r.status===200));
 await mutate(host.code,r=>r.lastTick=Date.now()-200);
 const synced=(await call('poll',g)).body;assert.equal(synced.match.entities.find(e=>e.id===host.id).crouch,true);assert.equal(synced.match.entities.find(e=>e.id===guest.id).weapon,1);assert.equal(JSON.stringify(synced).includes(host.token),false);assert.equal(JSON.stringify(synced).includes(guest.token),false);assert.equal(Object.hasOwn(synced.match.entities[0],'input'),false);
 await mutate(host.code,r=>{for(const e of r.match.entities.filter(e=>e.team===0)){e.status='dead';e.hp=0}r.lastTick=Date.now()-200});
 assert.equal((await call('poll',g)).body.match.state,'playing');
 await call('leave',h);assert.equal((await call('poll',g)).body.isHost,true);
 await mutate(host.code,r=>r.match.state='ended');const second=(await call('start',g)).body.match;assert.notEqual(second.id,launched.body.match.id);
 await mutate(host.code,r=>{r.match.drop=0;r.lastTick=Date.now()-200});await call('poll',{...g,controls:{actions:[]}});
 const fresh=(await call('poll',g)).body.match;assert.equal(fresh.entities.find(e=>e.id===guest.id).weapon,0);
 const queue=(await call('matchmake',{mode:'solo',name:'Queue host'})).body,other=(await call('matchmake',{mode:'solo',name:'Queue friend'})).body;
 assert.equal(queue.code,other.code);assert.equal(queue.queue,true);assert.equal(queue.teamSize,1);assert.equal((await call('team',{...auth(queue),team:1})).status,400);
 await mutate(queue.code,r=>r.startsAt=Date.now()-1);const fill=(await call('poll',auth(queue))).body.match;assert.equal(fill.entities.length,50);assert.equal(fill.entities.filter(e=>e.human).length,2);assert.equal(new Set(fill.entities.map(e=>e.team)).size,50);
 const next=(await call('matchmake',{mode:'solo'})).body;assert.notEqual(next.code,queue.code);
 const publicClients=await Promise.all(Array.from({length:50},(_,i)=>call('matchmake',{mode:'squad',name:'Public '+i})));
 assert.ok(publicClients.every(r=>[200,201].includes(r.status)));assert.equal(new Set(publicClients.map(r=>r.body.code)).size,1,'concurrent public matchmaking uses one waiting room');
 assert.equal((await call('poll',auth(publicClients[0].body))).body.match.entities.filter(e=>e.human).length,50);
 for(const mode of ['solo','squad']){
  const owner=(await call('create',{mode,name:'Capacity host'})).body,start=performance.now();
  const joins=await Promise.all(Array.from({length:49},(_,i)=>call('join',{code:owner.code,name:'Player '+i})));
  assert.ok(joins.every(r=>r.status===200),JSON.stringify(joins.filter(r=>r.status!==200)));
  const clients=[owner,...joins.map(r=>r.body)];assert.equal(new Set(clients.map(p=>p.id)).size,50);
  const waiting=(await call('poll',auth(owner))).body;assert.equal(waiting.state,'waiting');assert.equal(waiting.match,null,'a full private room still waits for the owner');assert.equal(waiting.startsAt,null);await mutate(owner.code,r=>r.startsAt=Date.now()-1);assert.equal((await call('poll',auth(owner))).body.match,null,'private rooms never use a matchmaking countdown');const snapshot=(await call('start',auth(owner))).body;assert.equal(snapshot.match.entities.length,50);assert.equal(snapshot.match.entities.filter(e=>e.human).length,50);assert.equal(snapshot.players.length,50);
  for(const team of new Set(snapshot.players.map(p=>p.team)))assert.equal(snapshot.players.filter(p=>p.team===team).length,mode==='solo'?1:5);
  assert.equal((await call('join',{code:owner.code,name:'51st'})).status,409);
  await mutate(owner.code,r=>{r.match.drop=0;r.lastTick=Date.now()-200});
  const polls=await Promise.all(clients.map(p=>call('poll',{...auth(p),controls:{actions:[{seq:1,type:'crouch'}]}})));assert.ok(polls.every(r=>r.status===200));
  await mutate(owner.code,r=>r.lastTick=Date.now()-200);const synchronized=(await call('poll',{...auth(owner),controls:{actions:[{seq:1,type:'crouch'}]}})).body;
  assert.equal(synchronized.match.entities.filter(e=>e.crouch).length,50);assert.ok(JSON.stringify(synchronized).length<120000);
  console.log(mode+': 50 concurrent joins and control packets passed in '+Math.round(performance.now()-start)+' ms locally');
 }
 assert.equal((await call('create',null)).status,400);assert.equal((await call('join',{code:'XXXXXX'})).status,404);
 console.log('Online tests passed: 50-player solo, ten squads of five, bot fill, matchmaking, team movement, authorization, appearance, action replay isolation and token privacy');
}finally{DB.close()}
