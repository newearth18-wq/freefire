import assert from 'node:assert/strict';
import {api} from '../server/worker.mjs';
import {localDatabase} from './local-db.mjs';
const DB=await localDatabase();
async function call(op,body,origin='https://test.example'){const response=await api(new Request('https://test.example/api/rooms/'+op,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)}),{DB});return{status:response.status,body:await response.json()}}
try{
 const look={character:'nova',upper:2,lower:1,feet:0,upperColor:4,hair:3,skin:2,backpack:false};
 const host=await call('create',{name:'Host',appearance:look});assert.equal(host.status,201);assert.match(host.body.code,/^[A-Z2-9]{6}$/);assert.ok(host.body.token);assert.equal(host.body.players.length,1);const code=host.body.code;assert.equal(host.body.players[0].appearance.character,'nova');assert.equal(host.body.players[0].appearance.backpack,false);
 const guest=await call('join',{code,name:'Friend'});assert.equal(guest.status,200);assert.equal(guest.body.players.length,2);assert.equal(guest.body.isHost,false);
 const h={code,token:host.body.token},g={code,token:guest.body.token};assert.equal((await call('start',g)).status,403);assert.equal((await call('poll',{code,token:'wrong'})).status,401);assert.equal((await call('poll',h,'https://other.example')).status,403);
 assert.equal((await call('appearance',{code,token:'wrong',appearance:look})).status,401);
 const dressed=await call('appearance',{...g,appearance:{character:'ghost',upper:2,lower:2,feet:2,upperColor:999,hair:-1,skin:2,backpack:false,token:'injected'}});assert.equal(dressed.status,200);const guestLook=dressed.body.players.find(p=>p.id===guest.body.id).appearance;assert.equal(guestLook.character,'ghost');assert.equal(guestLook.upperColor,0,'invalid appearance options are normalized');assert.equal(Object.hasOwn(guestLook,'token'),false);
 const third=await call('join',{code,name:'Third'}),fourth=await call('join',{code,name:'Fourth'});assert.equal(fourth.body.players.length,4);assert.equal((await call('join',{code,name:'Fifth'})).status,409);
 const launched=await call('start',h);assert.equal(launched.status,200);assert.equal(launched.body.match.mode,'squad');assert.equal(launched.body.match.entities.filter(e=>e.human).length,4);assert.equal((await call('start',h)).status,409);
 assert.equal(launched.body.match.entities.find(e=>e.id===host.body.id).appearance.upperColor,4);assert.deepEqual(launched.body.match.entities.find(e=>e.id===guest.body.id).appearance,guestLook);assert.equal((await call('appearance',{...g,appearance:look})).status,409,'appearance is fixed during a match');
 const restored=await call('join',{...g,name:'reconnect'});assert.equal(restored.status,200);assert.equal(restored.body.id,guest.body.id);assert.equal(restored.body.players.length,4);
 const row=await DB.prepare('SELECT data FROM rooms WHERE code=?').bind(code).first();const room=JSON.parse(row.data);room.match.drop=0;room.lastTick=Date.now()-250;await DB.prepare('UPDATE rooms SET data=? WHERE code=?').bind(JSON.stringify(room),code).run();
 const responses=await Promise.all([call('poll',{...h,controls:{mx:1,yaw:0,actions:[{seq:1,type:'crouch'}]}}),call('poll',{...g,controls:{mx:-1,yaw:0,actions:[{seq:1,type:'swap',index:1}]}})]);assert.ok(responses.every(r=>r.status===200));
 const synced=(await call('poll',g)).body;assert.equal(synced.match.id,launched.body.match.id);assert.equal(synced.match.entities.find(e=>e.id===host.body.id).crouch,true);assert.equal(synced.match.entities.find(e=>e.id===guest.body.id).weapon,1);assert.ok(synced.match.entities.find(e=>e.id===host.body.id).x>launched.body.match.entities.find(e=>e.id===host.body.id).x);
 assert.equal(JSON.stringify(synced).includes(host.body.token),false,'host secret is never disclosed to a friend');assert.equal(JSON.stringify(synced).includes(guest.body.token),false);
 await call('leave',h);const promoted=(await call('poll',g)).body;assert.equal(promoted.isHost,true);assert.equal(promoted.players.length,3);assert.equal(promoted.match.entities.find(e=>e.id===host.body.id).human,false);
 assert.equal((await call('create',null)).status,400);assert.equal((await call('join',{code:'XXXXXX'})).status,404);
 console.log('Online tests passed: four-person room, joining, ownership, authorization, reconnecting, concurrent synchronization, token privacy, host transfer and synchronized/validated appearance');
}finally{DB.close()}
