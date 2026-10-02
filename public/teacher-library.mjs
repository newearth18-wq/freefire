export async function teacherRequest(operation,input){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const get=['me','sets','set'].includes(operation),query=operation==='set'?'?id='+encodeURIComponent(input.id):'',response=await fetch('/api/teachers/'+operation+query,{method:get?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:get?{}:{'Content-Type':'application/json'},...(get?{}:{body:JSON.stringify(input)}),signal:controller.signal});
  let value;try{value=await response.json()}catch{throw Error('คลังข้อสอบไม่พร้อม ข้อมูลที่แก้ไขยังอยู่ กรุณาลองอีกครั้ง')}if(!response.ok)throw Object.assign(Error(value.error??'เปิดคลังข้อสอบไม่ได้'),{status:response.status});return value;
 }catch(error){if(controller.signal.aborted)throw Error('เชื่อมต่อคลังข้อสอบช้า ข้อมูลที่แก้ไขยังอยู่ กรุณาลองอีกครั้ง');if(error instanceof TypeError)throw Error('เชื่อมต่อคลังข้อสอบไม่ได้ ข้อมูลที่แก้ไขยังอยู่ กรุณาลองอีกครั้ง');throw error}finally{clearTimeout(timer)}
}
export function setupTeacherLibrary({read,load,newDraft,getRoom,getLegacy,getMap}){
 const $=id=>document.getElementById(id);let user=null,current=null,busy=false,dirty=false,lastRoom=null,ownerId=null;
 const status=message=>{$('teacher-status').textContent=message};
 function locked(){user=null;$('teacher-auth').hidden=false;$('teacher-editor').hidden=true;$('teacher-account').hidden=true;$('teacher-auth-status').textContent='เข้าสู่ระบบครูเพื่อเพิ่ม แก้ไข และเก็บข้อสอบส่วนตัว';}
 function controls(){$('teacher-editor').disabled=busy||!user;for(const id of['teacher-bank-save','teacher-bank-new','teacher-bank-delete','teacher-set','teacher-save','teacher-practice'])$(id).disabled=busy||!user||(id==='teacher-bank-delete'&&!current?.id)||(id==='teacher-save'&&getRoom()&&(!getRoom().isTeacher||getRoom().match?.state==='playing'))}
 function changed(){dirty=true;status('มีการแก้ไขที่ยังไม่ได้บันทึก');}
 $('teacher-editor').addEventListener('input',changed);$('teacher-editor').addEventListener('change',e=>{if(e.target.id!=='teacher-set'&&e.target.id!=='questions-import')changed()});
 async function list(){const value=await teacherRequest('sets');const select=$('teacher-set');select.replaceChildren();const blank=document.createElement('option');blank.value='';blank.textContent=value.sets.length?'เลือกชุดจากคลังของฉัน':'ยังไม่มีชุดข้อสอบที่บันทึก';select.append(blank);for(const s of value.sets){const option=document.createElement('option');option.value=s.id;option.textContent=s.title+' · '+s.questionCount+' ข้อ';select.append(option)}select.value=current?.id??'';return value.sets}
 function choose(set){current=set;$('teacher-set-title').value=set.title;load(set.lesson,set.mapId);dirty=false;$('teacher-set').value=set.id??'';status(set.updated?'บันทึกล่าสุด '+new Date(set.updated).toLocaleString('th-TH'):'ชุดใหม่ · ยังไม่ได้บันทึก');controls()}
 async function select(id){const value=await teacherRequest('set',{id});choose(value.set)}
 async function open(){
  let verified=false;busy=true;controls();$('teacher-auth-status').textContent='กำลังตรวจบัญชีครู…';
  try{
   const me=await teacherRequest('me');verified=true;if(!me.user){locked();return false}if(ownerId&&ownerId!==me.user.id){current=null;dirty=false;lastRoom=null;$('teacher-set-title').value='';newDraft()}ownerId=me.user.id;user=me.user;$('teacher-account-name').textContent=user.name;$('teacher-account-email').textContent=user.email;$('teacher-auth').hidden=true;$('teacher-editor').hidden=false;$('teacher-account').hidden=false;$('teacher-import-local').hidden=!getLegacy?.();
   const sets=await list(),room=getRoom();
   if(room?.isTeacher&&lastRoom!==room.code&&!dirty){current=null;lastRoom=room.code;choose({title:'ข้อสอบห้อง '+room.code,mapId:room.mapId,lesson:{...room.lesson,questions:room.teacherQuestions}})}
   else if(!current&&!dirty&&!room&&sets.length)await select(sets[0].id);
   controls();return true;
  }catch(error){if(!verified)locked();status(error.message);$('teacher-auth-status').textContent=error.message;return false}finally{busy=false;controls()}
 }
 async function save(){
  if(busy)throw Error('กำลังบันทึก กรุณารอสักครู่');busy=true;controls();status('กำลังบันทึกในบัญชีครู…');
  try{const value=await teacherRequest('save',{...(current?.id?{id:current.id,revision:current.revision}:{}),title:$('teacher-set-title').value,...read()});current=value.set;dirty=false;await list();status('บันทึกในคลังของฉันแล้ว · '+current.lesson.questions.length+' ข้อ');return current}
  catch(error){if(error.status===401)locked();status(error.message);throw error}finally{busy=false;controls()}
 }
 $('teacher-auth-retry').onclick=open;
 $('teacher-import-local').onclick=()=>{if(busy||!user||dirty&&!window.confirm('ทิ้งการแก้ไขที่ยังไม่บันทึก แล้วนำเข้าชุดเดิมหรือไม่?'))return;const legacy=getLegacy?.();if(!legacy)return;choose({title:'ข้อสอบเดิมจากเครื่องนี้',mapId:getMap(),lesson:legacy});current=null;changed();controls()};
 $('teacher-bank-save').onclick=()=>save().catch(()=>{});
 $('teacher-bank-new').onclick=()=>{if(busy||dirty&&!window.confirm('ทิ้งการแก้ไขที่ยังไม่บันทึก แล้วสร้างชุดใหม่หรือไม่?'))return;current=null;$('teacher-set-title').value='';$('teacher-set').value='';newDraft();changed();controls();$('teacher-set-title').focus()};
 $('teacher-set').onchange=async e=>{if(busy)return;const id=e.target.value;if(!id){e.target.value=current?.id??'';return}if(dirty&&!window.confirm('ทิ้งการแก้ไขที่ยังไม่บันทึก แล้วเปิดชุดที่เลือกหรือไม่?')){e.target.value=current?.id??'';return}busy=true;controls();try{await select(id)}catch(error){status(error.message);e.target.value=current?.id??''}finally{busy=false;controls()}};
 $('teacher-bank-delete').onclick=async()=>{if(busy||!current||!window.confirm('ลบชุด “'+current.title+'” ออกจากคลังของฉันหรือไม่? ห้องที่สร้างไว้แล้วจะยังใช้ข้อสอบเดิม'))return;busy=true;controls();try{await teacherRequest('delete',{id:current.id,revision:current.revision});current=null;$('teacher-set-title').value='';dirty=false;newDraft();await list();status('ลบชุดข้อสอบแล้ว')}catch(error){status(error.message)}finally{busy=false;controls()}};
 addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue=''}});
 controls();return{open,save,changed,get signedIn(){return !!user},get busy(){return busy}};
}
