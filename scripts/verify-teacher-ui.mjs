import assert from 'node:assert/strict';
import {setupTeacherLibrary} from '../public/teacher-library.mjs';
import {teacherApi} from '../server/teachers.mjs';
import {localDatabase} from './local-db.mjs';
import {normalizeLesson,SAMPLE_QUESTIONS} from '../public/learning.mjs';
import {setupClassroom} from '../public/classroom.mjs';
import {api} from '../server/worker.mjs';
// Component fixture using the real bank API and database. No browser navigation.
class Node{constructor(){this.hidden=false;this.disabled=false;this.value='';this.children=[];this.textContent='';this.listeners={}}replaceChildren(){this.children=[]}append(...nodes){this.children.push(...nodes)}focus(){}addEventListener(type,fn){this.listeners[type]=fn}after(){}querySelectorAll(){return []}}
const nodes=new Map(),listeners=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id)};
globalThis.document={getElementById:node,createElement:()=>new Node()};let consent=true;globalThis.window={confirm:()=>consent};globalThis.addEventListener=(type,fn)=>listeners.set(type,fn);
const DB=await localDatabase(),originalFetch=globalThis.fetch;let identity={},offline=false,slowSave=null,calls=[];
globalThis.fetch=async(url,init)=>{calls.push({url,init});if(offline)throw Error('offline');if(slowSave&&url.endsWith('/save'))await slowSave;return teacherApi(new Request('https://test.example'+url,{...init,headers:{...init.headers,Origin:'https://test.example',...identity}}),{DB})};
let draft=normalizeLesson({enabled:true}),map='dawn',room=null;
const reset=()=>{draft=normalizeLesson({enabled:true,questions:[SAMPLE_QUESTIONS[0]]})};
const library=setupTeacherLibrary({getRoom:()=>room,getLegacy:()=>normalizeLesson({questions:[SAMPLE_QUESTIONS[1]]}),getMap:()=>map,read:()=>({lesson:draft,mapId:map}),load:(lesson,mapId)=>{draft=structuredClone(lesson);map=mapId},newDraft:reset});
try{
 assert.equal(await library.open(),false);assert.equal(node('teacher-editor').hidden,true);assert.equal(node('teacher-editor').disabled,true);assert.equal(node('teacher-auth').hidden,false);assert.equal(calls.some(c=>c.url.endsWith('/sets')),false,'anonymous visitors do not load any bank');
 identity={'oai-authenticated-user-id':'alice','oai-authenticated-user-email':'alice@example.test'};assert.equal(await library.open(),true);assert.equal(node('teacher-editor').hidden,false);assert.equal(node('teacher-account-email').textContent,'alice@example.test');
 node('teacher-set-title').value='<img src=x onerror=alert(1)>';let release;slowSave=new Promise(r=>release=r);const saving=library.save();assert.equal(node('teacher-editor').disabled,true,'the draft is locked during save');release();slowSave=null;const set=await saving;
 assert.equal(node('teacher-editor').disabled,false);assert.equal(node('teacher-set').children[1].textContent,'<img src=x onerror=alert(1)> · 8 ข้อ','user titles render as text, never HTML');assert.equal(calls.find(c=>c.url.endsWith('/save')).init.credentials,'same-origin');
 draft.questions[0].text='ปรับคำถาม';library.changed();const edit=await library.save();assert.equal(edit.id,set.id);assert.equal(edit.revision,1);assert.equal(edit.lesson.questions[0].text,'ปรับคำถาม');
 offline=true;draft.questions[0].text='ยังไม่บันทึก';library.changed();await assert.rejects(library.save());assert.equal(draft.questions[0].text,'ยังไม่บันทึก');let prevented=false;listeners.get('beforeunload')({preventDefault(){prevented=true}});assert.equal(prevented,true,'failed saves keep the draft dirty and protect navigation');offline=false;
 consent=false;node('teacher-bank-new').onclick();assert.equal(draft.questions[0].text,'ยังไม่บันทึก','declining discard keeps the draft');consent=true;node('teacher-bank-new').onclick();assert.equal(node('teacher-set-title').value,'');assert.equal(node('teacher-bank-delete').disabled,true);
 node('teacher-import-local').onclick();assert.equal(node('teacher-set-title').value,'ข้อสอบเดิมจากเครื่องนี้');assert.equal(draft.questions[0].subject,'วิทยาศาสตร์');const imported=await library.save();assert.notEqual(imported.id,set.id,'legacy device questions require an explicit private-bank save');
 const sameAccount=await library.open();assert.equal(sameAccount,true);node('teacher-set').value=set.id;await node('teacher-set').onchange({target:node('teacher-set')});assert.equal(draft.questions[0].text,'ปรับคำถาม','reopening reads the saved question, not an abandoned edit');
 identity={};assert.equal(await library.open(),false);assert.equal(node('teacher-editor').hidden,true);assert.equal(node('teacher-account').hidden,true);
 identity={'oai-authenticated-user-id':'bob','oai-authenticated-user-email':'bob@example.test'};await library.open();assert.equal(node('teacher-set').children.length,1);assert.equal(node('teacher-set-title').value,'');assert.notEqual(draft.questions[0].text,'ปรับคำถาม','switching accounts clears the previous private draft');
 room={code:'ABCDEF',isTeacher:false};await library.open();assert.equal(node('teacher-save').disabled,true,'a signed-in visitor cannot apply settings to somebody else’s room');
 room={code:'OWN123',isTeacher:true,mapId:'highland',lesson:{enabled:true,durationMinutes:10,questionSeconds:30,ammoReward:30,itemReward:'med'},teacherQuestions:[SAMPLE_QUESTIONS[0]]};await library.open();assert.equal(map,'highland');assert.equal(node('teacher-bank-delete').disabled,true,'an unsaved room snapshot is not a deletable library record');
 assert.ok(calls.every(c=>!c.url.startsWith('/signin-with-chatgpt')),'SIWC remains a top-level link, never fetch');
 // Exercise the actual question editor and its save-then-create callback, not a
 // simulated replacement of that workflow.
 identity={'oai-authenticated-user-id':'alice','oai-authenticated-user-email':'alice@example.test'};room=null;globalThis.localStorage={getItem:()=>null};let created,createCalls=0;
 const realInterval=globalThis.setInterval;globalThis.setInterval=()=>0;
 try{
  const classroom=setupClassroom({getRoom:()=>null,getMap:()=>map,question(){},answer(){},configure(){},practice(){},onOpen(){},onClose(){},create:async settings=>{createCalls++;const response=await api(new Request('https://test.example/api/rooms/create',{method:'POST',headers:{Origin:'https://test.example',...identity},body:JSON.stringify({mode:'solo',...settings})}),{DB});assert.equal(response.status,201);created=await response.json()}});
  await classroom.launch();node('teacher-set-title').value='คาบวันนี้';node('lesson-map').value='desert';node('lesson-duration').value='15';const questionInput=node('teacher-questions').children[0].children[2].children[1];questionInput.value='คำถามจากหน้าครูจริง';questionInput.oninput();
  const first=node('teacher-save').onclick(),duplicate=node('teacher-save').onclick();await Promise.all([first,duplicate]);assert.equal(createCalls,1,'double clicks cannot create two classes');assert.equal(created.match,null);assert.equal(created.mapId,'desert');assert.equal(created.lesson.durationMinutes,15);assert.equal(created.teacherQuestions[0].text,'คำถามจากหน้าครูจริง');assert.equal(node('teacher-panel').hidden,true);
  const bank=await teacherApi(new Request('https://test.example/api/teachers/sets',{headers:identity}),{DB});assert.ok((await bank.json()).sets.some(s=>s.title==='คาบวันนี้'),'creating a class also persists the edited exam in the account bank');
 }finally{globalThis.setInterval=realInterval}
 console.log('Teacher UI passed: sign-in gate, private bank save/reopen, busy state, text rendering, failed-save preservation, explicit legacy import, account switching and room permissions');
}finally{globalThis.fetch=originalFetch;DB.close()}
