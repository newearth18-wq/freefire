import assert from 'node:assert/strict';
import {api} from '../server/worker.mjs';
import {localDatabase} from './local-db.mjs';
import {MAPS} from '../public/maps.mjs';
import {activateMap,ACTIVE_MAP,BUILDINGS,STATIC_SOLIDS,groundHeight,canStand} from '../public/arena.mjs';
import {makeMatch,tick,damage,act} from '../public/engine.mjs';
import {zoneAt} from '../public/rules.mjs';
import {SAMPLE_QUESTIONS,normalizeLesson} from '../public/learning.mjs';
const DB=await localDatabase();
const call=async(op,input)=>{const r=await api(new Request('https://test.example/api/rooms/'+op,{method:'POST',headers:{Origin:'https://test.example'},body:JSON.stringify(input)}),{DB});return{status:r.status,body:await r.json()}};
const auth=p=>({code:p.code,token:p.token});
async function mutate(code,fn){const r=await DB.prepare('SELECT data FROM rooms WHERE code=?').bind(code).first(),room=JSON.parse(r.data);fn(room);await DB.prepare('UPDATE rooms SET data=? WHERE code=?').bind(JSON.stringify(room),code).run()}
try{
 const layouts=[];for(const map of MAPS){activateMap(map.id);assert.equal(ACTIVE_MAP.id,map.id);assert.ok(canStand(map.playRadius-15,0,[],.45,0),'expanded bounds accept positions beyond the old island');assert.ok(!canStand(map.playRadius+1,0,[],.45,0));layouts.push(JSON.stringify(BUILDINGS));const m=makeMatch({mapId:map.id});assert.equal(m.entities.length,50);assert.equal(m.zone,map.playRadius);assert.ok(m.entities.every(e=>Number.isFinite(e.y)&&Math.hypot(e.x,e.z)<=map.playRadius));assert.ok(STATIC_SOLIDS.length>100);assert.equal(zoneAt(300,1200,map.playRadius).radius,map.playRadius);assert.ok(zoneAt(500,1200,map.playRadius).radius<map.playRadius)}assert.equal(new Set(layouts).size,3);
 const lesson=normalizeLesson({enabled:true,durationMinutes:5,questionSeconds:10,questions:SAMPLE_QUESTIONS.slice(0,2),ammoReward:30,itemReward:'armor'});
 const host=(await call('create',{mode:'squad',mapId:'highland',lesson})).body,guest=(await call('join',{code:host.code,name:'Student'})).body;assert.equal(host.lesson.questionCount,2);assert.ok(!JSON.stringify(guest).includes('explanation'));assert.equal(guest.teacherQuestions,undefined);assert.equal((await call('configure',{...auth(guest),mapId:'desert',lesson})).status,403);
 assert.equal((await call('configure',{...auth(host),mapId:'desert',lesson})).status,200);
 const started=(await call('start',auth(host))).body;assert.equal(started.match.mapId,'desert');assert.equal(started.match.duration,300);assert.ok(started.deadline-Date.now()<=300000);assert.equal((await call('poll',auth(guest))).body.match.entities.find(e=>e.id===guest.id).weapons[0].reserve,0);
 assert.equal((await call('configure',{...auth(host),mapId:'dawn',lesson})).status,409);
 const q=(await call('question',auth(guest))).body.learning.question;assert.equal(q.id,'q1');assert.ok(q.expiresAt>Date.now());assert.equal(q.answer,undefined);assert.equal(q.explanation,undefined);
 const result=await call('answer',{...auth(guest),matchId:started.match.id,questionId:q.id,choice:2});assert.equal(result.status,200);assert.equal(result.body.answerResult.correct,true);let actor=result.body.match.entities.find(e=>e.id===guest.id);assert.equal(actor.weapons[0].reserve,30);assert.equal(actor.armor,75);assert.equal(actor.learning,undefined);
 assert.equal((await call('answer',{...auth(guest),matchId:started.match.id,questionId:q.id,choice:2})).status,400,'replayed answers cannot duplicate rewards');
 assert.equal((await call('answer',{...auth(guest),matchId:'old-match',questionId:'q2',choice:1})).status,409);
 await call('question',auth(guest));await mutate(host.code,r=>r.match.entities.find(e=>e.id===guest.id).learning.startedAt=Date.now()-20000);
 const expired=await call('answer',{...auth(guest),matchId:started.match.id,questionId:'q2',choice:1});assert.equal(expired.body.answerResult.expired,true);assert.equal(expired.body.answerResult.reward,null);assert.equal(expired.body.match.entities.find(e=>e.id===guest.id).weapons[0].reserve,30);
 const done=(await call('question',auth(guest))).body;assert.equal(done.learning.question,null);assert.equal(done.learning.correct,1);assert.equal(done.learning.answered,2);
 await mutate(host.code,r=>r.deadline=Date.now()-1);const ended=(await call('poll',auth(host))).body;assert.equal(ended.match.state,'ended');assert.equal(ended.match.endReason,'time');assert.ok(ended.results.some(e=>e.id===guest.id&&e.correct===1));
 const a=(await call('matchmake',{mode:'solo',mapId:'dawn'})).body,b=(await call('matchmake',{mode:'solo',mapId:'highland'})).body;assert.notEqual(a.code,b.code,'matchmaking does not mix maps');
 const m=makeMatch({educational:true}),self=m.entities[0],enemy=m.entities[1];m.drop=0;self.studyUntil=10;damage(m,self,100,enemy);assert.equal(self.hp,100);const ammo=self.weapons[0].ammo;act(m,self,'fire');assert.equal(self.weapons[0].ammo,ammo,'protected studying players cannot shoot');m.time=11;damage(m,self,10,enemy);assert.ok(self.hp<100,'protection expires');
 const timed=makeMatch({duration:300});timed.drop=0;timed.time=299.99;tick(timed,.04);assert.equal(timed.endReason,'time');
 activateMap('dawn');console.log('Classroom passed: three distinct maps, enlarged bounds, slower timed zones, map queues, teacher permissions, hidden answers, rewards, replay/expiry, protection and teacher deadline');
}finally{DB.close()}
