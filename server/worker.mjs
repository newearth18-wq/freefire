import {makeMatch,setInput,advance,living} from '../public/engine.mjs';
import {normalizeAppearance} from '../public/appearance.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const nickname=value=>typeof value==='string'&&value.trim()?value.trim().slice(0,18):'ผู้รอดชีวิต';
function roomView(room,member){return{code:room.code,id:member.id,isHost:room.members[0]?.id===member.id,state:room.match?.state??'waiting',players:room.members.map(a=>({id:a.id,name:a.name,appearance:normalizeAppearance(a.appearance),host:a.id===room.members[0]?.id,connected:Date.now()-a.seen<12000})),match:room.match??null}}
function database(env){if(!env.DB)fail('ห้องออนไลน์ยังไม่พร้อม กรุณาลองอีกครั้ง',503);return env.DB}
function authenticate(room,token){const member=room.members.find(a=>a.token===token);if(!member)fail('เซสชันห้องหมดอายุ กรุณาเข้าห้องใหม่',401);return member}
export async function api(request,env){
 try{
 const url=new URL(request.url);if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)fail('ไม่อนุญาตคำขอจากเว็บไซต์อื่น',403);
 if(Number(request.headers.get('Content-Length')??0)>12000)fail('คำขอมีขนาดใหญ่เกินไป',413);
 const raw=await request.text();if(raw.length>12000)fail('คำขอมีขนาดใหญ่เกินไป',413);let input;try{input=JSON.parse(raw)}catch{fail('รูปแบบคำขอไม่ถูกต้อง')}
 if(!input||typeof input!=='object'||Array.isArray(input))fail('รูปแบบคำขอไม่ถูกต้อง');
 const db=database(env),operation=url.pathname.split('/').at(-1),now=Date.now();
 if(operation==='create'){
  await db.prepare('DELETE FROM rooms WHERE code IN (SELECT code FROM rooms WHERE expires<? LIMIT 20)').bind(now).run();
  const member={id:crypto.randomUUID(),token:crypto.randomUUID(),name:nickname(input.name),appearance:normalizeAppearance(input.appearance),seen:now};
  for(let n=0;n<4;n++){const bytes=crypto.getRandomValues(new Uint8Array(6)),alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',code=[...bytes].map(b=>alphabet[b%32]).join('');const room={code,members:[member],match:null,lastTick:now};try{await db.prepare('INSERT INTO rooms (code,data,revision,expires) VALUES (?,?,0,?)').bind(code,JSON.stringify(room),now+3600000).run();return json({...roomView(room,member),token:member.token},201)}catch(e){if(!String(e).includes('UNIQUE'))throw e}}
  fail('สร้างห้องไม่สำเร็จ กรุณาลองอีกครั้ง',503);
 }
 const code=typeof input.code==='string'?input.code.toUpperCase().replace(/\s/g,''):'';if(!/^[A-Z2-9]{6}$/.test(code))fail('กรุณาใส่รหัสห้อง 6 ตัว');
 for(let attempt=0;attempt<6;attempt++){
  const row=await db.prepare('SELECT data,revision,expires FROM rooms WHERE code=?').bind(code).first();if(!row||row.expires<now)fail('ไม่พบห้อง หรือห้องหมดอายุแล้ว',404);
  const room=JSON.parse(row.data);if(!room.match)room.members=room.members.filter(a=>a.token===input.token||now-a.seen<30000);let member;
  if(operation==='join'){
   if(input.token)member=room.members.find(a=>a.token===input.token);
   if(!member){if(room.match)fail('แมตช์เริ่มแล้ว ให้เจ้าของห้องเปิดแมตช์ใหม่',409);if(room.members.length>=4)fail('ห้องเต็มแล้ว (สูงสุด 4 คน)',409);member={id:crypto.randomUUID(),token:crypto.randomUUID(),name:nickname(input.name),appearance:normalizeAppearance(input.appearance),seen:now};room.members.push(member)}
  }else member=authenticate(room,input.token);member.seen=now;
  if(operation==='start'){
   if(room.members[0]?.id!==member.id)fail('เจ้าของห้องเท่านั้นที่เริ่มแมตช์ได้',403);
   if(room.match?.state==='playing')fail('แมตช์กำลังเล่นอยู่',409);
   room.match=makeMatch({mode:'squad',humans:room.members.map(a=>({id:a.id,name:a.name,appearance:a.appearance})),seed:now>>>0});room.lastTick=now;
  }else if(operation==='appearance'){
   if(room.match?.state==='playing')fail('เปลี่ยนชุดได้เมื่อจบแมตช์แล้ว',409);
   member.appearance=normalizeAppearance(input.appearance);
  }else if(operation==='leave'){
   room.members=room.members.filter(a=>a.id!==member.id);if(room.match){const actor=room.match.entities.find(a=>a.id===member.id);if(actor){actor.human=false;actor.input={};actor.name+=' (บอต)'}}
  }else if(!['join','poll'].includes(operation))fail('ไม่รองรับคำสั่งนี้',404);
  if(room.match?.state==='playing'){
   if(operation==='poll'&&input.controls&&typeof input.controls==='object')setInput(room.match,member.id,input.controls);
   const seconds=Math.min(.75,Math.max(0,(now-room.lastTick)/1000));advance(room.match,seconds);room.lastTick=now;
   if(!room.match.entities.some(a=>a.team===0&&living(a))){room.match.state='ended';room.match.winner=1}
  }
  const result=await db.prepare('UPDATE rooms SET data=?,revision=revision+1 WHERE code=? AND revision=?').bind(JSON.stringify(room),code,row.revision).run();
  if((result.meta?.changes??0)>0)return json(operation==='leave'?{left:true}:{...roomView(room,member),...(operation==='join'?{token:member.token}:{})});
 }
 return json({error:'ห้องกำลังซิงก์ กรุณาลองอีกครั้ง'},409);
 }catch(error){if(!error.status)console.error('Room request failed',error.message);return json({error:error.status?error.message:'เชื่อมต่อห้องไม่ได้ กรุณาลองอีกครั้ง'},error.status??503)}
}
export default{async fetch(request,env,ctx){const url=new URL(request.url);if(url.pathname.startsWith('/api/rooms/'))return api(request,env);return env.ASSETS.fetch(request)}};
