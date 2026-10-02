import assert from 'node:assert/strict';
import {api} from '../server/worker.mjs';
import {localDatabase} from './local-db.mjs';
import {SAMPLE_QUESTIONS,normalizeLesson} from '../public/learning.mjs';
import {activateMap,groundHeight} from '../public/arena.mjs';
const DB=await localDatabase(),clock=Date.now;let now=clock();Date.now=()=>now;
const call=async(op,input={})=>{const r=await api(new Request('https://test.example/api/rooms/'+op,{method:'POST',headers:{Origin:'https://test.example'},body:JSON.stringify(input)}),{DB});return{status:r.status,body:await r.json()}};
const auth=p=>({code:p.code,token:p.token});
async function mutate(code,fn){const row=await DB.prepare('SELECT data FROM rooms WHERE code=?').bind(code).first(),r=JSON.parse(row.data);fn(r);await DB.prepare('UPDATE rooms SET data=? WHERE code=?').bind(JSON.stringify(r),code).run()}
async function okay(op,input){const r=await call(op,input);assert.equal(r.status,200,JSON.stringify(r.body));return r.body}
try{
 assert.throws(()=>normalizeLesson({questions:[{...SAMPLE_QUESTIONS[0],image:'javascript:alert(1)'}]}));assert.throws(()=>normalizeLesson({questions:[{...SAMPLE_QUESTIONS[0],audio:'http://insecure.test/clip.mp3'}]}));const media=normalizeLesson({questions:[{...SAMPLE_QUESTIONS[0],image:'https://cdn.test/chart.png',audio:'https://cdn.test/listen.mp3',speech:'Hello class'}]});assert.equal(media.questions[0].speech,'Hello class');
 const profile=await okay('profile'),guestProfile=await okay('profile');assert.match(profile.token,/^[a-f0-9]{64}$/);assert.equal(profile.stars,0);assert.equal((await call('profile',{profileToken:'a'.repeat(64)})).status,401);
 assert.equal((await call('profile',{profileToken:profile.token,appearance:{cosmetic:'heart'}})).status,403,'locked cosmetics cannot be selected by changing client storage');
 const lesson=normalizeLesson({enabled:true,durationMinutes:5,questionSeconds:30,questions:SAMPLE_QUESTIONS});const host=(await call('create',{name:'Teacher',mode:'squad',lesson,profileToken:profile.token})).body,g1=await okay('join',{code:host.code,name:'A',profileToken:guestProfile.token}),g2=await okay('join',{code:host.code,name:'B'}),opponent=await okay('join',{code:host.code,name:'Other',team:1});
 let r=await okay('start',auth(host)),matchId=r.match.id;assert.ok(r.mission);assert.ok(!JSON.stringify(r.players).includes(profile.token));assert.ok(!JSON.stringify(r.match).includes(profile.token));
 await mutate(host.code,room=>{room.match.drop=0;for(const e of room.match.entities)e.botTimer=10000});
 assert.equal((await call('teacher',{...auth(g1),command:'pause'})).status,403);assert.equal((await call('teacher',{...auth(g1),command:'broadcast',questionId:'q1'})).status,403);
 let opened=await okay('question',auth(g1)),deadline=opened.learning.question.expiresAt,originalTime=opened.match.time;
 const paused=await okay('teacher',{...auth(host),command:'pause'});now+=600000;
 r=await okay('poll',{...auth(g1),controls:{mx:1,fire:true,actions:[{seq:1,type:'fire'}]}});assert.equal(r.match.state,'playing','pause blocks the match deadline');assert.equal(r.match.time,originalTime);assert.equal(r.match.entities.find(e=>e.id===g1.id).weapons[0].ammo,5);
 assert.equal((await call('answer',{...auth(g1),matchId,questionId:'q1',choice:2})).status,409);
 r=await okay('teacher',{...auth(host),command:'resume'});assert.equal(r.pausedAt,null);assert.equal(r.deadline,paused.deadline+600000);opened=await okay('poll',auth(g1));assert.equal(opened.learning.question.expiresAt,deadline+600000);assert.equal(opened.match.entities.find(e=>e.id===g1.id).weapons[0].ammo,5,'actions submitted during pause are not replayed');
 r=await okay('teacher',{...auth(host),command:'broadcast',questionId:'q4'});const broadcastId=r.learning.question.id;const questions=await Promise.all([g1,g2,opponent].map(g=>okay('poll',auth(g))));assert.ok(questions.every(g=>g.learning.question.id===broadcastId));assert.ok(questions.every(g=>g.learning.question.image==='/lesson-media/triangle.svg'));assert.ok(questions.every(g=>g.report===undefined&&g.teacherQuestions===undefined&&g.learning.question.answer===undefined),'only the teacher receives answer keys and report');
 for(const g of[host,g1,g2])await okay('answer',{...auth(g),matchId,questionId:broadcastId,choice:1});
 assert.equal((await call('answer',{...auth(g1),matchId,questionId:broadcastId,choice:1})).status,400);
 r=await okay('poll',auth(host));assert.equal(r.mission.credits,3);assert.equal(r.report.find(q=>q.id==='q4').correct,3);assert.equal(r.report.find(q=>q.id==='q4').choices[1],3);
 let stored=await okay('profile',{profileToken:guestProfile.token,...auth(g1)});assert.equal(stored.stars,2);assert.equal((await okay('profile',{profileToken:guestProfile.token,...auth(g1)})).stars,2,'ledger reconciliation is idempotent');
 assert.equal((await call('mission',auth(g1))).status,409,'claim requires reaching the actual objective');
 await mutate(host.code,room=>{activateMap(room.mapId);const e=room.match.entities.find(e=>e.id===g1.id);e.x=room.missions[0].x;e.z=room.missions[0].z;e.y=groundHeight(e.x,e.z)});
 r=await okay('mission',auth(g1));assert.equal(r.mission.stage,1);assert.equal(r.mission.target,6);assert.equal(r.answerResult.stage,0);assert.equal((await call('mission',auth(g1))).status,409);
 // A repeated broadcast gives feedback, but neither stars nor team credit again.
 await mutate(host.code,room=>room.broadcast.expiresAt=now-1);
 r=await okay('teacher',{...auth(host),command:'broadcast',questionId:'q4'});let qid=r.learning.question.id;
 r=await okay('answer',{...auth(g1),matchId,questionId:qid,choice:1});assert.equal(r.answerResult.correct,true);assert.equal(r.answerResult.reward,null);assert.equal(r.mission.credits,3);assert.equal((await okay('profile',{profileToken:guestProfile.token,...auth(g1)})).stars,2);
 for(const q of ['q1','q2']){await mutate(host.code,room=>room.broadcast.expiresAt=now-1);r=await okay('teacher',{...auth(host),command:'broadcast',questionId:q});qid=r.learning.question.id;const choice=q==='q1'?2:1;for(const g of [host,g1,g2])await okay('answer',{...auth(g),matchId,questionId:qid,choice})}
 r=await okay('mission',auth(g1));assert.equal(r.mission.stage,2,'team captured the learning point');
 await mutate(host.code,room=>room.match.entities.find(e=>e.id===g2.id).status='down');r=await okay('mission',auth(g1));assert.equal(r.mission.stage,3);assert.ok(r.answerResult.returned,'downed teammate can return');
 // If no teammate is down, the right to revive must remain unspent.
 await mutate(host.code,room=>{room.missions[0].stage=2;room.missions[0].credits=9;room.missions[0].target=9;for(const e of room.match.entities.filter(e=>e.team===0))e.status='alive'});assert.equal((await call('mission',auth(g1))).status,409);
 await mutate(host.code,room=>{const e=room.match.entities.find(e=>e.id===g2.id);e.status='dead';e.hp=0});r=await okay('mission',auth(g1));assert.equal(r.match.entities.find(e=>e.id===g2.id).status,'alive');assert.equal(r.match.entities.find(e=>e.id===g2.id).hp,45);
 r=await okay('ping',{...auth(g1),kind:'help',x:0,z:0});assert.equal(r.pings[0].name,'A');assert.equal((await okay('poll',auth(opponent))).pings.length,0,'other teams cannot see private markers');assert.equal((await call('ping',{...auth(g1),kind:'help',x:1,z:1})).status,429);now+=16000;assert.equal((await okay('poll',auth(host))).pings.length,0,'markers expire');assert.equal((await call('ping',{...auth(g1),kind:'help',x:9999,z:0})).status,400);
 for(const q of ['q3','q5']){await mutate(host.code,room=>room.broadcast.expiresAt=now-1);r=await okay('teacher',{...auth(host),command:'broadcast',questionId:q});await okay('answer',{...auth(g1),matchId,questionId:r.learning.question.id,choice:q==='q3'?2:2})}
 stored=await okay('profile',{profileToken:guestProfile.token,...auth(g1)});assert.equal(stored.stars,10);await okay('teacher',{...auth(host),command:'end'});stored=await okay('profile',{profileToken:guestProfile.token,appearance:{cosmetic:'scholar'}});assert.equal(stored.appearance.cosmetic,'scholar');const equipped=await okay('appearance',{...auth(g1),appearance:{cosmetic:'scholar'}});assert.equal(equipped.players.find(p=>p.id===g1.id).appearance.cosmetic,'scholar');
 assert.ok((await okay('poll',auth(host))).report.find(q=>q.id==='q4').attempts===4);console.log('Session features passed: synchronized pause/resume/deadlines, teacher authorization, media, broadcast privacy/replay, team mission claims/revive, private expiring pings, durable idempotent stars and locked cosmetics');
}finally{Date.now=clock;DB.close()}
