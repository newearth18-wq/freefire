import {scryptAsync} from '@noble/hashes/scrypt.js';

const COOKIE='__Host-teacher_session',AGE=7*86400;
const encoder=new TextEncoder();
let activeHashes=0;const hashWaiters=[];
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status})};
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const digest=async value=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0};
function cookies(request){const values=new Map();for(const part of(request.headers.get('Cookie')??'').split(';')){const i=part.indexOf('=');if(i>0)values.set(part.slice(0,i).trim(),part.slice(i+1).trim())}return values}
function cookie(name,value,age){return name+'='+value+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+age}
function response(value,status=200,session){const headers=new Headers({'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});if(session!==undefined)headers.set('Set-Cookie',cookie(COOKIE,session||'signed-out',session?AGE:365*86400));return new Response(JSON.stringify(value),{status,headers})}
export function platformTeacherIdentity(request){
 const id=request.headers.get('oai-authenticated-user-id'),email=request.headers.get('oai-authenticated-user-email');if(!id||!email||id.length>256||email.length>320)return null;
 let name=null;if(request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){try{name=decodeURIComponent(request.headers.get('oai-authenticated-user-full-name')??'')}catch{}}
 return{id,email,name:(name||email).slice(0,80),provider:'chatgpt'};
}
export async function resolveTeacherIdentity(request,db){
 const values=cookies(request),token=values.get(COOKIE);
 // A revoked/expired app session must never fall back to another account.
 if(token!==undefined){if(!db||! /^[a-f0-9]{64}$/.test(token))return null;const row=await db.prepare('SELECT c.owner_id,c.email,c.name FROM teacher_sessions s JOIN teacher_credentials c ON c.owner_id=s.owner_id WHERE s.token_hash=? AND s.expires>?').bind(await digest(token),Date.now()).first();return row?{id:row.owner_id,email:row.email,name:row.name,provider:'email'}:null}
 return platformTeacherIdentity(request);
}
function emailInput(value){if(typeof value!=='string')fail('กรอกอีเมลให้ถูกต้อง');const email=value.trim().toLowerCase();if(email.length>254||! /^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email))fail('กรอกอีเมลให้ถูกต้อง');return email}
function passwordInput(value){if(typeof value!=='string'||[...value].length<15||[...value].length>128||encoder.encode(value).length>512)fail('ใช้รหัสผ่าน 15–128 ตัวอักษร เช่น ประโยคที่จำง่าย');return value}
async function passwordHash(password,salt){
 // Bound memory and queued authentication work inside each Worker isolate.
 if(activeHashes>=2){if(hashWaiters.length>=8)fail('ระบบบัญชีกำลังรับหลายคำขอ กรุณาลองใหม่สักครู่',429);await new Promise(resolve=>hashWaiters.push(resolve))}else activeHashes++;
 try{const result=await scryptAsync(encoder.encode(password),encoder.encode(salt),{N:16384,r:8,p:5,dkLen:32,maxmem:32*1024*1024,asyncTick:8});const encoded='scrypt-16384-8-5:'+salt+':'+hex(result);result.fill(0);return encoded}finally{const next=hashWaiters.shift();if(next)next();else activeHashes--}
}
async function verify(password,hash){const parts=hash?.split(':');if(parts?.length!==3||parts[0]!=='scrypt-16384-8-5'||! /^[a-f0-9]{64}$/.test(parts[1])||! /^[a-f0-9]{64}$/.test(parts[2]))fail('บัญชีนี้ยังไม่พร้อม กรุณาลองอีกครั้ง',503);return equal(await passwordHash(password,parts[1]),hash)}
async function limit(db,request,email,now){
 // Persistent atomic counters also apply across Worker instances. Account/IP
 // keys are hashed; arbitrary email addresses and IPs are never logged here.
 const ip=request.headers.get('CF-Connecting-IP')??'local',window=15*60000,bucket=Math.floor(now/window);
 for(const [key,max] of [['ip:'+ip,60],['email:'+email,10],['global:'+Math.floor(now/60000),300]]){
  const row=await db.prepare('INSERT INTO teacher_auth_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(await digest(key+':'+bucket),now+window).first();if(row.count>max)fail('ลองหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่',429);
 }
 // Cleanup is bounded and only runs on the low-frequency authentication path.
 await db.prepare('DELETE FROM teacher_auth_limits WHERE key IN (SELECT key FROM teacher_auth_limits WHERE expires<? LIMIT 100)').bind(now).run();
 await db.prepare('DELETE FROM teacher_sessions WHERE token_hash IN (SELECT token_hash FROM teacher_sessions WHERE expires<? LIMIT 100)').bind(now).run();
}
async function session(db,owner,now){const token=random();await db.prepare('INSERT INTO teacher_sessions (token_hash,owner_id,expires) VALUES (?,?,?)').bind(await digest(token),owner,now+AGE*1000).run();return token}
export async function teacherAuthApi(request,env,operation){
 try{
  if(request.method!=='POST')fail('ไม่รองรับคำสั่งนี้',405);const url=new URL(request.url);if(request.headers.get('Origin')!==url.origin||request.headers.get('Sec-Fetch-Site')==='cross-site')fail('เปิดหน้าครูในเว็บไซต์นี้ก่อนเข้าสู่ระบบ',403);if(!env.DB)fail('ระบบบัญชียังไม่พร้อม กรุณาลองอีกครั้ง',503);
  const db=env.DB,values=cookies(request),now=Date.now();
  if(operation==='logout'){const token=values.get(COOKIE);if(token&&/^[a-f0-9]{64}$/.test(token))await db.prepare('DELETE FROM teacher_sessions WHERE token_hash=?').bind(await digest(token)).run();return response({signedOut:true},200,'')}
  if(Number(request.headers.get('Content-Length')??0)>4096)fail('ข้อมูลบัญชีใหญ่เกินไป',413);const raw=await request.text();if(encoder.encode(raw).length>4096)fail('ข้อมูลบัญชีใหญ่เกินไป',413);let input;try{input=JSON.parse(raw)}catch{fail('รูปแบบข้อมูลไม่ถูกต้อง')}if(!input||Array.isArray(input)||typeof input!=='object')fail('รูปแบบข้อมูลไม่ถูกต้อง');
  const email=emailInput(input.email);await limit(db,request,email,now);const password=passwordInput(input.password);
  const existing=await db.prepare('SELECT email,owner_id,name,password_hash,recovery_hash FROM teacher_credentials WHERE email=?').bind(email).first();
  if(operation==='login'){
   // Do the same expensive derivation for an unknown email. The response never
   // distinguishes an unknown account from a wrong password.
   const hash=existing?.password_hash??'scrypt-16384-8-5:'+('0'.repeat(64))+':'+('0'.repeat(64));const valid=await verify(password,hash);if(!existing||!valid)fail('อีเมลหรือรหัสผ่านไม่ถูกต้อง',401);const token=await session(db,existing.owner_id,now);return response({signedIn:true},200,token);
  }
  if(operation==='recover'){
   const code=typeof input.recoveryCode==='string'?input.recoveryCode.replace(/[\s-]/g,'').toLowerCase():'';const proof=await digest('teacher-recovery:'+code);if(! /^[a-f0-9]{64}$/.test(code)||!existing||!equal(proof,existing.recovery_hash))fail('อีเมลหรือรหัสกู้คืนไม่ถูกต้อง',401);
   const recoveryCode=random(),recoveryHash=await digest('teacher-recovery:'+recoveryCode),hash=await passwordHash(password,random());
   const results=await db.batch([db.prepare('UPDATE teacher_credentials SET password_hash=?,recovery_hash=? WHERE email=? AND recovery_hash=?').bind(hash,recoveryHash,email,proof),db.prepare('DELETE FROM teacher_sessions WHERE owner_id=? AND EXISTS (SELECT 1 FROM teacher_credentials WHERE owner_id=? AND recovery_hash=?)').bind(existing.owner_id,existing.owner_id,recoveryHash)]);if(!results[0].meta?.changes)fail('รหัสกู้คืนนี้ถูกใช้แล้ว กรุณาใช้รหัสล่าสุด',409);
   return response({signedIn:true,recoveryCode},200,await session(db,existing.owner_id,now));
  }
  if(!['register','link'].includes(operation))fail('ไม่รองรับคำสั่งนี้',405);
  let owner='mail:'+crypto.randomUUID(),name=typeof input.name==='string'?input.name.trim():'';if(!name||name.length>80)fail('กรอกชื่อครู 1–80 ตัวอักษร');
  if(operation==='link'){const legacy=platformTeacherIdentity(request);if(!legacy)fail('เข้าสู่บัญชี ChatGPT เดิมก่อนเชื่อมข้อสอบ',401);if(email!==emailInput(legacy.email))fail('ใช้เมลเดียวกับบัญชีเดิมเพื่อเชื่อมข้อสอบ');owner=legacy.id}
  if(existing)fail('อีเมลนี้มีบัญชีแล้ว กรุณาเข้าสู่ระบบ หรือกู้คืนด้วยรหัสที่เก็บไว้',409);
  const recoveryCode=random(),recoveryHash=await digest('teacher-recovery:'+recoveryCode),hash=await passwordHash(password,random());
  try{await db.batch([db.prepare('INSERT INTO teacher_accounts (id,created) VALUES (?,?) ON CONFLICT(id) DO NOTHING').bind(owner,now),db.prepare('INSERT INTO teacher_credentials (email,owner_id,name,password_hash,recovery_hash,created) VALUES (?,?,?,?,?,?)').bind(email,owner,name,hash,recoveryHash,now)])}catch(error){if(/UNIQUE|constraint/i.test(error.message))fail('บัญชีนี้มีรหัสผ่านแล้ว กรุณาเข้าสู่ระบบ',409);throw error}
  return response({signedIn:true,recoveryCode},201,await session(db,owner,now));
 }catch(error){if(!error.status)console.error('Teacher authentication failed');return response({error:error.status?error.message:'ระบบบัญชีเชื่อมต่อไม่ได้ กรุณาลองอีกครั้ง'},error.status??503)}
}
