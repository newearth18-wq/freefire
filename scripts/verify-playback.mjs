import {mergeRoomSnapshot} from '../public/snapshots.mjs';
import {FrameMeter,AdaptiveResolution,renderProfile} from '../public/performance.mjs';
import assert from 'node:assert/strict';
import {MotionPredictor} from '../public/motion.mjs';
import {setupClassroom} from '../public/classroom.mjs';
import {openQuestion,answerQuestion,normalizeLesson} from '../public/learning.mjs';
import {makeMatch} from '../public/engine.mjs';
import {activateMap,STATIC_SOLIDS,BUILDINGS,canStand,groundHeight,lineClear,rayBox,nearbySolids,seeded} from '../public/arena.mjs';
// Flight must progress at every display frame, even with sparse network snapshots.
activateMap('dawn');const actor={x:0,z:0,y:25,yaw:0,status:'alive',jump:0,vy:0},p=new MotionPredictor();p.reset(actor,6);const original=structuredClone(actor);let previousY=25,frames=0;
for(let n=1;n<=300;n++){const seconds=n/60;if(n%15===0)p.receive({...actor,y:25-seconds/6*25}, {},0,[],6-seconds);const position=p.step(actor,{},1/60,[],true,6-seconds);assert.ok(position.y<previousY,'descent advances between snapshots');assert.ok(previousY-position.y<.12,'snapshots do not create large vertical jumps');previousY=position.y;frames++}
assert.equal(frames,300);assert.deepEqual(actor,original,'prediction does not change server hitboxes');assert.ok(previousY<4.3&&previousY>3.8);p.step({...actor,y:10},{},1/60,[],false,2.4);assert.equal(p.position.y,10,'teacher pause follows the fixed authoritative pose');
// Broad phase must agree with complete collision/ray checks on all maps.
for(const map of['dawn','highland','desert']){activateMap(map);const rand=seeded(31);let candidateCount=0;for(let n=0;n<350;n++){const x=(rand()-.5)*500,z=(rand()-.5)*500,feet=groundHeight(x,z),radius=.45;const full=Math.hypot(x,z)<=({dawn:260,highland:320,desert:280}[map])&&!STATIC_SOLIDS.some(s=>Math.abs(x-s.x)<s.w+radius&&Math.abs(z-s.z)<s.d+radius&&feet+2>s.y+.05&&feet<=s.y+s.h-.05);assert.equal(canStand(x,z,STATIC_SOLIDS,radius,feet),full);candidateCount+=[...nearbySolids(STATIC_SOLIDS,x-1,z-1,x+1,z+1)].length;const a={x,y:feet+1,z},b={x:x+rand()*40-20,y:feet+1,z:z+rand()*40-20},length=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z),dir={x:(b.x-a.x)/length,y:(b.y-a.y)/length,z:(b.z-a.z)/length};assert.equal(lineClear(a,b),!STATIC_SOLIDS.some(s=>rayBox(a,dir,s,length-.2)!==null))}assert.ok(candidateCount/350<STATIC_SOLIDS.length*.1,'movement checks visit less than 10% of colliders on average');for(const b of BUILDINGS){const extra={x:b.x,z:b.z,w:.5,d:.5,y:groundHeight(b.x,b.z),h:3,wall:1};assert.equal(canStand(b.x,b.z,[...STATIC_SOLIDS,extra],.45,extra.y),false,'dynamic walls remain in broad-phase results')}}
// A component fixture executes the real quiz UI without opening a browser.
class Node{constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.hidden=false;this.value='';this.textContent='';this.disabled=false}append(...nodes){this.children.push(...nodes)}replaceChildren(...nodes){this.children=nodes}after(node){this.following=node}addEventListener(){}focus(){document.activeElement=this}querySelector(){return null}querySelectorAll(){return []}getClientRects(){return[{}]}}
const nodes=new Map(),intervals=[],listeners=[];globalThis.document={activeElement:new Node(),createElement:tag=>new Node(tag),getElementById:id=>{if(!nodes.has(id)){const n=new Node();n.hidden=id.endsWith('-panel');nodes.set(id,n)}return nodes.get(id)}};globalThis.window={};globalThis.localStorage={getItem:()=>null,setItem(){}};globalThis.addEventListener=(name,fn)=>listeners.push({name,fn});const realInterval=setInterval,realClear=clearInterval;globalThis.setInterval=fn=>(intervals.push(fn),intervals.length);globalThis.clearInterval=()=>{};
try{const lesson=normalizeLesson({enabled:true}),match=makeMatch({educational:true,humans:[{id:'you',name:'Learner'}]}),room={lesson,match},self=match.entities[0];let requests=0;const ui=setupClassroom({getRoom:()=>null,getMap:()=>match.mapId,onOpen(){},onClose(){},create(){},configure(){},practice(){},question:async()=>{requests++;return openQuestion(room,self,Date.now())},answer:async(id,choice)=>answerQuestion(room,self,{questionId:id,choice},Date.now())});
 ui.update(null,match,self);await Promise.resolve();assert.equal(requests,0,'questions never interrupt parachuting');match.drop=0;match.time=2;ui.update(null,match,self);match.time=200;ui.update(null,match,self);await Promise.resolve();assert.equal(requests,0,'elapsed time and landing never open a question');assert.equal(nodes.get('quiz-open').hidden,false,'the learner has a visible button after landing');assert.equal(nodes.get('quiz-panel').hidden,true);const notice={broadcastId:'teacher',id:'q1:teacher',expiresAt:Date.now()+30000};assert.equal(ui.receiveBroadcast(notice,match.id),false);assert.equal(nodes.get('quiz-panel').hidden,true,'a teacher broadcast cannot force the quiz overlay open');nodes.get('quiz-open').onclick();nodes.get('quiz-open').onclick();await Promise.resolve();assert.equal(requests,1,'a button click opens exactly one request');assert.equal(nodes.get('quiz-choices').children.length,4);assert.equal(nodes.get('quiz-title').textContent,lesson.questions[0].text);nodes.get('quiz-choices').children[2].onclick();await Promise.resolve();await Promise.resolve();assert.equal(self.learning.correct,1);assert.equal(self.weapons[0].reserve,30,'answer actually earns supplies');ui.closeQuiz();match.time=400;ui.update(null,match,self);await Promise.resolve();assert.equal(requests,1,'the next question also waits for a click');nodes.get('quiz-open').onclick();await Promise.resolve();assert.equal(requests,2);match.state='ended';ui.update(null,match,self);assert.equal(nodes.get('quiz-panel').hidden,true,'ending closes the quiz');assert.equal(nodes.get('quiz-open').hidden,true);

}finally{globalThis.setInterval=realInterval;globalThis.clearInterval=realClear;for(const l of listeners)if(l.name==='pagehide')l.fn()}
console.log('Playback passed: continuous 60 Hz parachuting with 4 Hz snapshots, pause, unchanged hitboxes, all-map collision equivalence, bounded broad phase, manual-only quizzes including teacher broadcasts, duplicate-click protection and actual supplies');

// A delayed poll must not roll back a newer quiz reward or teacher command.
const state={code:'ABCDEF',snapshotRevision:8,token:'private',pausedAt:123,match:{id:'new',loot:[{id:1}],entities:[{id:'you',weapons:[{reserve:30}]}]}};
const stale=mergeRoomSnapshot(state,{code:'ABCDEF',snapshotRevision:7,pausedAt:null,match:{id:'new',entities:[{id:'you',weapons:[{reserve:0}]}]}});assert.equal(stale.match.entities[0].weapons[0].reserve,30);assert.equal(stale.pausedAt,123);
const delta=mergeRoomSnapshot(state,{code:'ABCDEF',snapshotRevision:9,match:{id:'new',entities:[{id:'you'}]}});assert.deepEqual(delta.match.loot,state.match.loot);assert.equal(delta.token,'private');
const restarted=mergeRoomSnapshot(state,{code:'ABCDEF',snapshotRevision:10,match:{id:'other',loot:[{id:2}],entities:[]}});assert.deepEqual(restarted.match.loot,[{id:2}]);assert.equal(mergeRoomSnapshot(state,{code:'ZZZZZZ',snapshotRevision:0,match:null}).code,'ZZZZZZ');
const meter=new FrameMeter();meter.record(100,1,10,100);meter.record(600,1,10,100);assert.equal(meter.read().fps,2,'half-second freezes count toward adaptive quality');meter.reset();assert.equal(meter.read().samples,0);
console.log('Snapshots passed: cached loot, full refresh, match changes, out-of-order protection, private session preservation and long-frame measurement');

// High-density phone canvas must retain real scene pixels instead of enlarging
// a half-resolution image, without allocating unbounded 4K/high-DPR buffers.
for(const [width,height] of [[390,844],[844,390],[960,440],[1280,800]]){
 const profile=renderProfile({width,height,dpr:3,touch:true});
 assert.ok(profile.pixelRatio>=1.25,'auto preserves at least 1.25 scene pixels per CSS pixel on common mobile/tablet viewports');
 assert.equal(profile.shadows,false);assert.equal(profile.detail,'low');
 const minimum=renderProfile({width,height,dpr:3,touch:true,scale:.55});assert.ok(minimum.pixelRatio>=1,'old blurry scale is clamped');
 const sharp=renderProfile({quality:'sharp',width,height,dpr:3,touch:true});assert.ok(sharp.pixelRatio>profile.pixelRatio,'sharp mode increases phone clarity');assert.equal(sharp.shadows,false,'crisper mobile rendering does not enable shadow passes');
}
for(const quality of ['auto','sharp','smooth'])for(const dpr of [1,2,4]){
 const result=renderProfile({quality,width:3840,height:2160,dpr});
 assert.ok(3840*2160*result.pixelRatio**2<=({auto:1800000,sharp:3200000,smooth:900000}[quality])+1,'large screens stay within the render budget');
}
assert.equal(renderProfile({width:800,height:400,dpr:1}).pixelRatio,1,'ordinary density screens are not needlessly supersampled');
const graphics=new AdaptiveResolution(),slow={samples:180,fps:30,frameP95Ms:38},fast={samples:180,fps:60,frameP95Ms:18};
assert.equal(graphics.update({...slow,samples:10}),false,'warmup cannot lower resolution');
assert.equal(graphics.update(slow),false,'one slow interval cannot lower resolution');
assert.equal(graphics.update(fast),false,'an isolated long frame is not cumulative');assert.equal(graphics.scale,1.5);
for(let n=0;n<24;n++)graphics.update(slow);assert.equal(graphics.scale,1,'sustained slow rendering never drops phones to half resolution');
for(let n=0;n<3;n++)assert.equal(graphics.update(fast),false,'recovery waits for sustained headroom');assert.equal(graphics.update(fast),true);assert.equal(graphics.scale,1.125);
for(let n=0;n<40;n++)graphics.update(fast);assert.equal(graphics.scale,1.5,'resolution can recover after the workload falls');
graphics.update(slow);graphics.reset();assert.equal(graphics.scale,1.5);assert.equal(graphics.update(slow),false,'a new match starts with a fresh measurement window');
console.log('Clarity passed: high-density phone/tablet buffers, bounded desktop allocation, native minimum, stable adaptation, warmup and recovery');
