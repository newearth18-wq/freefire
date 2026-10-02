export async function teacherRequest(operation,input){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const get=['me','sets','set'].includes(operation),query=operation==='set'?'?id='+encodeURIComponent(input.id):'',response=await fetch('/api/teachers/'+operation+query,{method:get?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:get?{}:{'Content-Type':'application/json'},...(get?{}:{body:JSON.stringify(input)}),signal:controller.signal});
  let value;try{value=await response.json()}catch{throw Error('คลังข้อสอบไม่พร้อม ข้อมูลที่แก้ไขยังอยู่ กรุณาลองอีกครั้ง')}if(!response.ok)throw Object.assign(Error(value.error??'เปิดคลังข้อสอบไม่ได้'),{status:response.status});return value;
 }catch(error){if(controller.signal.aborted)throw Error('เชื่อมต่อคลังข้อสอบช้า ข้อมูลที่แก้ไขยังอยู่ กรุณาลองอีกครั้ง');if(error instanceof TypeError)throw Error('เชื่อมต่อคลังข้อสอบไม่ได้ ข้อมูลที่แก้ไขยังอยู่ กรุณาลองอีกครั้ง');throw error}finally{clearTimeout(timer)}
}
export function setupTeacherLibrary({read,load,newDraft,getRoom,getLegacy,getMap,refreshRoom}){
 const $=id=>document.getElementById(id);let user=null,current=null,busy=false,dirty=false,lastRoom=null,ownerId=null,authMode='login',recoveryPending=false;
 const status=message=>{$('teacher-status').textContent=message};
 function locked(){user=null;$('teacher-auth').hidden=false;$('teacher-editor').hidden=true;$('teacher-account').hidden=true;mode('login');$('teacher-auth-status').textContent='เข้าสู่ระบบด้วยอีเมลและรหัสผ่านเพื่อเปิดคลังข้อสอบของคุณ';}
 function controls(){$('teacher-editor').disabled=busy||!user;for(const id of['teacher-bank-save','teacher-bank-new','teacher-bank-delete','teacher-set','teacher-save','teacher-practice'])$(id).disabled=busy||!user||(id==='teacher-bank-delete'&&!current?.id)||(id==='teacher-save'&&getRoom()&&(!getRoom().isTeacher||getRoom().match?.state==='playing'))}
 function changed(){dirty=true;status('มีการแก้ไขที่ยังไม่ได้บันทึก');}
 function clearPrivate(){current=null;dirty=false;lastRoom=null;ownerId=null;$('teacher-set-title').value='';$('teacher-set').replaceChildren();newDraft();$('teacher-recovery-code').value='';$('teacher-recovery-note').hidden=true;recoveryPending=false;const room=getRoom();if(room){room.isTeacher=false;room.teacherQuestions=null;room.report=null}}
 function mode(value){
  authMode=value;const fresh=value!=='login',link=value==='link',recover=value==='recover';$('teacher-auth-title').textContent={login:'เข้าสู่ระบบครู',register:'สมัครบัญชีครู',recover:'ตั้งรหัสผ่านใหม่',link:'เชื่อมคลังข้อสอบเดิม'}[value];$('teacher-name-row').hidden=!(value==='register'||link);$('teacher-auth-name').required=value==='register'||link;$('teacher-confirm-row').hidden=!fresh;$('teacher-auth-confirm').required=fresh;$('teacher-recovery-row').hidden=!recover;$('teacher-auth-recovery').required=recover;$('teacher-password-label').textContent=recover?'รหัสผ่านใหม่':'รหัสผ่าน';$('teacher-auth-password').autocomplete=fresh?'new-password':'current-password';$('teacher-auth-modes').hidden=link;$('teacher-legacy').hidden=link;$('teacher-auth-cancel').hidden=!link;$('teacher-auth-submit').textContent={login:'เข้าสู่ระบบ',register:'สมัครและเปิดคลังข้อสอบ',recover:'ตั้งรหัสผ่านใหม่',link:'ตั้งรหัสผ่านและเก็บข้อสอบเดิม'}[value];for(const type of['login','register','recover'])$('teacher-mode-'+type).setAttribute('aria-pressed',String(value===type));$('teacher-auth-password').value='';$('teacher-auth-confirm').value='';$('teacher-auth-recovery').value='';$('teacher-auth-email').readOnly=link;if(link&&user){$('teacher-auth-email').value=user.email;$('teacher-auth-name').value=user.name}$('teacher-auth-status').textContent=recover?'ใช้รหัสกู้คืนที่ดาวน์โหลดหรือเก็บไว้ตอนสมัคร รหัสเก่าจะใช้ไม่ได้หลังตั้งรหัสใหม่':'กรอกอีเมลและรหัสผ่านเพื่อเปิดคลังข้อสอบส่วนตัว';
 }
 function authControls(disabled){for(const id of['teacher-auth-name','teacher-auth-email','teacher-auth-password','teacher-auth-confirm','teacher-auth-recovery','teacher-auth-submit','teacher-auth-cancel','teacher-mode-login','teacher-mode-register','teacher-mode-recover','teacher-logout','teacher-link-account','teacher-auth-retry'])$(id).disabled=disabled}
 $('teacher-editor').addEventListener('input',changed);$('teacher-editor').addEventListener('change',e=>{if(e.target.id!=='teacher-set'&&e.target.id!=='questions-import')changed()});
 async function list(){const value=await teacherRequest('sets');const select=$('teacher-set');select.replaceChildren();const blank=document.createElement('option');blank.value='';blank.textContent=value.sets.length?'เลือกชุดจากคลังของฉัน':'ยังไม่มีชุดข้อสอบที่บันทึก';select.append(blank);for(const s of value.sets){const option=document.createElement('option');option.value=s.id;option.textContent=s.title+' · '+s.questionCount+' ข้อ';select.append(option)}select.value=current?.id??'';return value.sets}
 function choose(set){current=set;$('teacher-set-title').value=set.title;load(set.lesson,set.mapId);dirty=false;$('teacher-set').value=set.id??'';status(set.updated?'บันทึกล่าสุด '+new Date(set.updated).toLocaleString('th-TH'):'ชุดใหม่ · ยังไม่ได้บันทึก');controls()}
 async function select(id){const value=await teacherRequest('set',{id});choose(value.set)}
 async function open(){
  let verified=false;busy=true;controls();$('teacher-auth-status').textContent='กำลังตรวจบัญชีครู…';
  try{
   const me=await teacherRequest('me');verified=true;if(!me.user){locked();return false}if(ownerId&&ownerId!==me.user.id)clearPrivate();ownerId=me.user.id;user=me.user;$('teacher-account-name').textContent=user.name;$('teacher-account-email').textContent=user.email;$('teacher-auth').hidden=true;$('teacher-editor').hidden=false;$('teacher-account').hidden=false;$('teacher-link-account').hidden=user.provider!=='chatgpt';$('teacher-import-local').hidden=!getLegacy?.();
   if(refreshRoom&&getRoom())await refreshRoom();const sets=await list(),room=getRoom();
   if(room?.isTeacher&&lastRoom!==room.code&&!dirty){current=null;lastRoom=room.code;choose({title:'ข้อสอบห้อง '+room.code,mapId:room.mapId,lesson:{...room.lesson,questions:room.teacherQuestions}})}
   else if(!current&&!dirty&&!room&&sets.length)await select(sets[0].id);
   controls();return true;
  }catch(error){if(!verified||error.status===401)locked();status(error.message);$('teacher-auth-status').textContent=error.message;return false}finally{busy=false;controls()}
 }
 for(const type of['login','register','recover'])$('teacher-mode-'+type).onclick=()=>{if(!busy)mode(type)};
 $('teacher-link-account').onclick=()=>{if(busy)return;$('teacher-auth').hidden=false;$('teacher-editor').hidden=true;mode('link');$('teacher-auth-password').focus()};
 $('teacher-auth-cancel').onclick=()=>{if(!busy)open()};
 $('teacher-auth-form').onsubmit=async event=>{
  event.preventDefault();if(busy)return;const password=$('teacher-auth-password').value;if(authMode!=='login'&&password!==$('teacher-auth-confirm').value){$('teacher-auth-status').textContent='รหัสผ่านและการยืนยันไม่ตรงกัน';return}if([...password].length<15||[...password].length>128){$('teacher-auth-status').textContent='ใช้รหัสผ่าน 15–128 ตัวอักษร';return}
  busy=true;controls();authControls(true);$('teacher-auth-status').textContent='กำลังเข้าสู่ระบบ…';
  try{const result=await teacherRequest(authMode,{email:$('teacher-auth-email').value,password,name:$('teacher-auth-name').value,recoveryCode:$('teacher-auth-recovery').value});$('teacher-auth-password').value='';$('teacher-auth-confirm').value='';$('teacher-auth-recovery').value='';busy=false;await open();if(result.recoveryCode){$('teacher-recovery-code').value=result.recoveryCode.match(/.{1,8}/g).join('-');$('teacher-recovery-note').hidden=false;recoveryPending=true;$('teacher-recovery-download').focus()}}
  catch(error){$('teacher-auth-status').textContent=error.message}finally{busy=false;controls();authControls(false)}
 };
 $('teacher-logout').onclick=async()=>{if(busy||dirty&&!window.confirm('มีข้อสอบที่ยังไม่ได้บันทึก ออกจากระบบและทิ้งการแก้ไขหรือไม่?')||recoveryPending&&!window.confirm('ยังไม่ได้ยืนยันว่าเก็บรหัสกู้คืนแล้ว ต้องการออกจากระบบหรือไม่?'))return;busy=true;controls();authControls(true);try{await teacherRequest('logout',{});clearPrivate();locked();status('ออกจากระบบแล้ว')}catch(error){status(error.message)}finally{busy=false;controls();authControls(false)}};
 $('teacher-recovery-download').onclick=()=>{const code=$('teacher-recovery-code').value;if(!code)return;const url=URL.createObjectURL(new Blob(['LAST ISLAND — รหัสกู้คืนบัญชีครู\nอีเมล: '+(user?.email??$('teacher-auth-email').value)+'\nรหัสกู้คืน: '+code+'\nเก็บเป็นส่วนตัว ใช้ตั้งรหัสผ่านใหม่เมื่อจำรหัสผ่านไม่ได้\n'],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='last-island-teacher-recovery.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 $('teacher-recovery-done').onclick=()=>{recoveryPending=false;$('teacher-recovery-code').value='';$('teacher-recovery-note').hidden=true};
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
 addEventListener('beforeunload',event=>{if(dirty||recoveryPending){event.preventDefault();event.returnValue=''}});
 controls();return{open,save,changed,get signedIn(){return !!user},get busy(){return busy}};
}
