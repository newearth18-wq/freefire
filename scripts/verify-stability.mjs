import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {InputHistory,snapshotLocalTime,newerMotion,predictionFresh} from '../public/input-history.mjs';
import {VehiclePredictor,driveVehicle} from '../public/vehicles.mjs';
import {MotionPredictor} from '../public/motion.mjs';
import {makeMatch,tick,setInput,advance,colliders} from '../public/engine.mjs';
import {activateMap,STATIC_SOLIDS,rayBox,groundHeight,canStand} from '../public/arena.mjs';
import {findRoute,clearRoute} from '../public/navigation.mjs';

activateMap('dawn');
const actor={x:.54,y:0,z:0,status:'alive',yaw:0,jump:0,vy:0,heal:0},moving={mx:1,mz:0,yaw:0},history=new InputHistory();
history.record(0,moving);history.record(100,{});
const current=new MotionPredictor();current.reset(actor);
current.receiveHistory(actor,history,250,500,[],0,moving);
assert.ok(Math.abs(current.error.x)<1e-8,'a response sent before key-up cannot start movement again');
const old=new MotionPredictor();old.reset(actor);old.receive(actor,moving,.25,[]);assert.ok(old.error.x>1,'the former single-input reconciliation reproduces the incorrect forward correction');
history.record(250,{mx:1,mz:0,yaw:Math.PI/2});
current.position={x:.54,y:0,z:-1.35};current.receiveHistory(actor,history,250,500,[],0,moving);
assert.ok(Math.abs(current.error.x)<1e-8&&Math.abs(current.error.z)<1e-8,'replay follows an actual turn made while the packet was in flight');
assert.equal(snapshotLocalTime({receivedAt:1000,serverNow:1400,simulatedAt:1000},0,500),50,'400 ms of server work is removed before estimating network transit');
assert.equal(newerMotion({snapshotRevision:9,simulatedAt:100,match:{id:'m'}},{snapshotRevision:9,simulatedAt:100,match:{id:'m'}}),false,'unchanged snapshots cannot repeat a correction');
assert.equal(newerMotion({snapshotRevision:9,simulatedAt:100,match:{id:'m'}},{snapshotRevision:8,simulatedAt:120,match:{id:'m'}}),false,'an out-of-order response cannot rewind movement');
assert.equal(newerMotion({snapshotRevision:9,simulatedAt:100,match:{id:'m'}},{snapshotRevision:10,simulatedAt:100,match:{id:'m'}}),false,'a quiz-only revision does not replay old movement');
assert.equal(newerMotion({snapshotRevision:9,simulatedAt:100,match:{id:'m'}},{snapshotRevision:10,simulatedAt:120,match:{id:'m'}}),true);
assert.equal(predictionFresh(1001,100),false);assert.equal(predictionFresh(1501,1200),false,'slow networks cannot cause unlimited speculative movement');assert.equal(predictionFresh(800,400),true,'ordinary delayed packets preserve presentation');
const car={id:0,x:0,z:0,y:0,yaw:0,speed:0,seats:['you']},carInput={mz:-1},carHistory=new InputHistory();carHistory.record(0,carInput);const slowCar=new VehiclePredictor(),fastCar=new VehiclePredictor();slowCar.receive(car,{},0,[]);fastCar.receive(car,{},0,[]);
for(let n=0;n<10;n++)slowCar.step(car,carInput,.1,[]);for(let n=0;n<60;n++)fastCar.step(car,carInput,1/60,[]);assert.ok(Math.abs(slowCar.vehicle.z-fastCar.vehicle.z)<1e-6,'low frame rates cannot halve predicted car speed');
const echoed=structuredClone(car);for(let n=0;n<30;n++)driveVehicle(echoed,carInput,1/60,[]);fastCar.receiveHistory(echoed,carHistory,500,1000,[]);assert.ok(Math.abs(fastCar.error.z)<1e-6,'vehicle reconciliation replays actual controls to the present');
// Execute the actual client handlers in a component fixture. Mount/dismount
// events are also delivered in offline practice, without a network snapshot.
const client=await readFile(new URL('../public/client.mjs',import.meta.url),'utf8'),extract=name=>{const start=client.indexOf('function '+name+'('),end=client.indexOf('\nfunction ',start+1);return client.slice(start,end)};
const eventsMatch=makeMatch(),me=eventsMatch.entities[0],notices=[];eventsMatch.drop=0;me.vehicleId=0;eventsMatch.vehicles[0].seats=[me.id];eventsMatch.events=[{seq:1,type:'vehicle',id:me.id,vehicleId:0}];
const context={match:eventsMatch,self:()=>me,selfId:me.id,lastEvent:0,yaw:0,vehiclePrediction:new VehiclePredictor(),inputHistory:new InputHistory(),snapshotLocalTime,colliders,controls:()=>({}),resetInput(){},toast:text=>notices.push(text),sound:{play(){}}};
runInNewContext(extract('receiveVehicle')+'\n'+extract('processEvents')+'\nprocessEvents();processEvents();',context,{timeout:1000});assert.equal(notices.length,1,'mount events run once without throwing or stopping the frame loop');assert.ok(context.vehiclePrediction.vehicle);
for(let n=0;n<10000;n++)history.record(n*16,moving);assert.ok(history.samples.length<=240,'long matches retain bounded control history');
const p=new MotionPredictor(),wall=[{x:1,z:0,w:.1,d:2,y:0,h:3}];p.reset({...actor,x:0});p.receive({...actor,x:0},moving,.75,wall);assert.ok(p.error.x<.46,'high latency prediction cannot tunnel through a thin wall');
const delayed=makeMatch();delayed.drop=0;delayed.loot=[];for(const e of delayed.entities)e.human=true;
Object.assign(delayed.entities[0],{x:0,y:0,z:34});setInput(delayed,'you',moving);advance(delayed,1.4);
assert.ok(delayed.entities[0].x>7.5,'a 1.4 second packet gap retains elapsed authoritative walking instead of losing half of it');
for(const mapId of ['dawn','highland','desert']){
 const match=makeMatch({mapId,seed:183}),samples=[];
 for(let n=0;n<1500;n++){const at=performance.now();tick(match,1/30);samples.push(performance.now()-at)}
 assert.equal(match.entities.length,50);assert.ok(match.entities.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)));
 const warm=samples.slice(240).sort((a,b)=>a-b),p99=warm[Math.floor(warm.length*.99)];
 assert.ok(p99<45,'99% of warmed CPU ticks stay below 45 ms on this test machine');
 console.log(mapId+': CPU mean '+(samples.reduce((a,b)=>a+b)/samples.length).toFixed(2)+' ms, warm p99 '+p99.toFixed(2)+' ms');
 // Keep swept-route equivalence after broad-phase and bounded search changes.
 for(let n=0;n<20;n++){const a={x:n*4-40,z:8},b={x:a.x+30,z:8},length=30,origin={...a,y:groundHeight(a.x,a.z)+1},dir={x:1,y:0,z:0};assert.equal(clearRoute(a,b),!STATIC_SOLIDS.some(s=>origin.y>=s.y&&origin.y<=s.y+s.h&&rayBox(origin,dir,{...s,w:s.w+.49,d:s.d+.49},length)!==null));if(!canStand(a.x,a.z,STATIC_SOLIDS,.55,groundHeight(a.x,a.z)))continue;const path=findRoute(a,b);let from=a;for(const point of path){assert.ok(clearRoute(from,point),'returned shortcuts cannot cross walls');from=point}}
}
const worker=await readFile(new URL('../server/worker.mjs',import.meta.url),'utf8');assert.ok(worker.includes('simulatedAt:room.lastTick')&&worker.includes('serverNow:Date.now()'),'transport exposes authoritative simulation and processing timestamps');
console.log('Stability passed: delayed key-up/turns, server processing time, stale/duplicate packets, bounded history, thin-wall collision, delayed authority, safe bot routes and all-map 50-actor CPU tails (not GPU FPS)');
