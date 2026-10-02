import {normalizeLesson} from '../public/learning.mjs';
import {validMap} from '../public/maps.mjs';
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status})};
export const teacherSignIn='/signin-with-chatgpt?return_to=%2F%3Fteacher%3D1';
// These headers are supplied by Sites dispatch. An app-supplied ID, room token,
// localStorage value or email field never establishes a teacher identity.
export function teacherIdentity(request){
 const id=request.headers.get('oai-authenticated-user-id'),email=request.headers.get('oai-authenticated-user-email');
 if(!id||!email||id.length>256||email.length>320)return null;
 let name=request.headers.get('oai-authenticated-user-full-name');
 if(name&&request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){try{name=decodeURIComponent(name)}catch{name=null}}
 return{id,name:(name||email).slice(0,80),email};
}
export function requireTeacher(identity){if(!identity)fail('เข้าสู่ระบบครูก่อนจัดการข้อสอบ',401);return identity}
export function canTeachRoom(room,member,identity){return !room.queue&&!!identity&&room.members[0]?.id===member.id&&(!room.teacherOwnerId||room.teacherOwnerId===identity.id)}
export async function ownedQuestionSet(db,identity,id){
 requireTeacher(identity);if(typeof id!=='string'||!/^[-a-z0-9]{36}$/i.test(id))fail('ไม่พบชุดข้อสอบ',404);
 const row=await db.prepare('SELECT id,title,map_id,lesson,revision,created,updated FROM teacher_question_sets WHERE id=? AND owner_id=?').bind(id,identity.id).first();
 if(!row)fail('ไม่พบชุดข้อสอบในบัญชีนี้',404);
 return{id:row.id,title:row.title,mapId:row.map_id,lesson:JSON.parse(row.lesson),revision:row.revision,created:row.created,updated:row.updated};
}
export async function teacherApi(request,env){
 try{
  const url=new URL(request.url),op=url.pathname.slice('/api/teachers/'.length),identity=teacherIdentity(request);
  const origin=request.headers.get('Origin');if(origin&&origin!==url.origin||request.headers.get('Sec-Fetch-Site')==='cross-site')fail('ไม่อนุญาตคำขอจากเว็บไซต์อื่น',403);
  if(op==='me'&&request.method==='GET')return json({user:identity?{id:identity.id,name:identity.name,email:identity.email}:null,signInPath:teacherSignIn,signOutPath:'/signout-with-chatgpt?return_to=%2F'});
  requireTeacher(identity);if(!env.DB)fail('คลังข้อสอบยังไม่พร้อม กรุณาลองอีกครั้ง',503);const db=env.DB;
  if(op==='sets'&&request.method==='GET'){
   const rows=await db.prepare('SELECT id,title,map_id,revision,created,updated,question_count FROM teacher_question_sets WHERE owner_id=? ORDER BY updated DESC,id LIMIT 100').bind(identity.id).all();
   return json({sets:rows.results.map(r=>({id:r.id,title:r.title,mapId:r.map_id,revision:r.revision,created:r.created,updated:r.updated,questionCount:r.question_count}))});
  }
  if(op==='set'&&request.method==='GET')return json({set:await ownedQuestionSet(db,identity,url.searchParams.get('id'))});
  if(!['save','delete'].includes(op)||request.method!=='POST')fail('ไม่รองรับคำสั่งนี้',405);
  if(origin!==url.origin)fail('เปิดหน้าครูในเว็บไซต์นี้ก่อนบันทึก',403);
  if(Number(request.headers.get('Content-Length')??0)>64000)fail('ชุดข้อสอบใหญ่เกิน 64 KB',413);
  const raw=await request.text();if(new TextEncoder().encode(raw).length>64000)fail('ชุดข้อสอบใหญ่เกิน 64 KB',413);
  let input;try{input=JSON.parse(raw)}catch{fail('รูปแบบข้อมูลไม่ถูกต้อง')}if(!input||typeof input!=='object'||Array.isArray(input))fail('รูปแบบข้อมูลไม่ถูกต้อง');
  let current;if(input.id){current=await ownedQuestionSet(db,identity,input.id);if(!Number.isInteger(input.revision)||input.revision!==current.revision)fail('ข้อสอบนี้ถูกแก้ไขจากอีกหน้าต่างแล้ว กรุณาเปิดชุดล่าสุดก่อนบันทึก',409)}
  if(op==='delete'){
   if(!current)fail('เลือกชุดข้อสอบก่อนลบ');const result=await db.prepare('DELETE FROM teacher_question_sets WHERE id=? AND owner_id=? AND revision=?').bind(current.id,identity.id,current.revision).run();if(!result.meta?.changes)fail('ข้อสอบเปลี่ยนไปแล้ว กรุณาโหลดรายการใหม่',409);return json({deleted:true});
  }
  if(typeof input.title!=='string'||!input.title.trim()||input.title.trim().length>80)fail('ตั้งชื่อชุดข้อสอบ 1–80 ตัวอักษร');if(!validMap(input.mapId))fail('เลือกแมพที่มีอยู่');
  const lesson=normalizeLesson(input.lesson),title=input.title.trim(),now=Date.now();
  await db.prepare('INSERT INTO teacher_accounts (id,created) VALUES (?,?) ON CONFLICT(id) DO NOTHING').bind(identity.id,now).run();
  const id=current?.id??crypto.randomUUID();
  const result=current?await db.prepare('UPDATE teacher_question_sets SET title=?,map_id=?,lesson=?,question_count=?,revision=revision+1,updated=? WHERE id=? AND owner_id=? AND revision=?').bind(title,input.mapId,JSON.stringify(lesson),lesson.questions.length,now,id,identity.id,current.revision).run():await db.prepare('INSERT INTO teacher_question_sets (id,owner_id,title,map_id,lesson,question_count,revision,created,updated) SELECT ?,?,?,?,?,?,0,?,? WHERE (SELECT COUNT(*) FROM teacher_question_sets WHERE owner_id=?)<100').bind(id,identity.id,title,input.mapId,JSON.stringify(lesson),lesson.questions.length,now,now,identity.id).run();
  if(!result.meta?.changes)fail(current?'ข้อสอบถูกแก้ไขจากอีกหน้าต่าง กรุณาเปิดชุดล่าสุด':'บันทึกได้สูงสุด 100 ชุดต่อบัญชี',409);
  return json({set:await ownedQuestionSet(db,identity,id)},current?200:201);
 }catch(error){if(!error.status)console.error('Teacher library failed',error.message);return json({error:error.status?error.message:'คลังข้อสอบเชื่อมต่อไม่ได้ ข้อมูลที่แก้ไขยังอยู่ กรุณาลองอีกครั้ง'},error.status??503)}
}
