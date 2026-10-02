// Names and weapon roles reference Garena's catalog. Combat values are tuned for this web arena.
const gun=(id,name,kind,mag,rate,damage,range,reload,spread,pellets,extra={})=>({id,name,kind,mag,rate,damage,range,reload,spread,pellets,auto:true,recoil:.012,recovery:5,bloom:.13,falloff:.65,penetration:0,scopes:[0,1,2,4],...extra});
export const WEAPONS=[
 gun('m4','M4A1','ASSAULT RIFLE',30,.14,26,100,1.8,.012,1,{description:'ไรเฟิลสมดุล คุมง่าย เหมาะระยะกลาง'}),
 gun('mp40','MP40','SUBMACHINE GUN',20,.075,18,45,1.5,.026,1,{scopes:[0,1],falloff:.4,recoil:.008,description:'ยิงรัวระยะประชิด แม็กเล็ก'}),
 gun('m1887','M1887','SHOTGUN',2,.62,14,27,1.9,.075,8,{auto:false,scopes:[0],recoil:.045,falloff:.2,description:'ลูกซองสองนัด แรงมากเมื่อเข้าใกล้'}),
 gun('ak','AK47','ASSAULT RIFLE',30,.17,34,105,2.2,.017,1,{recoil:.026,description:'พลังสูง แลกกับแรงถีบที่มากขึ้น'}),
 gun('scar','SCAR','ASSAULT RIFLE',30,.13,25,95,1.9,.011,1,{recoil:.010,description:'ยิงต่อเนื่อง คุมง่ายและแม่นระยะกลาง'}),
 gun('m1014','M1014','SHOTGUN',6,.48,11,30,2.4,.085,7,{scopes:[0],recoil:.035,falloff:.25,description:'ลูกซองกึ่งอัตโนมัติ ยิงต่อเนื่องได้'}),
 gun('ump','UMP','SUBMACHINE GUN',30,.095,22,58,1.7,.022,1,{penetration:.35,falloff:.5,description:'SMG เจาะเกราะ เหมาะการต่อสู้เคลื่อนที่'}),
 gun('vector','VECTOR','SUBMACHINE GUN',25,.065,16,42,1.65,.028,1,{scopes:[0,1],recoil:.009,falloff:.4,description:'ยิงเร็วมาก ใช้กระสุนไวในระยะใกล้'}),
 gun('sks','SKS','MARKSMAN RIFLE',16,.34,52,145,2.3,.004,1,{auto:false,fixedScope:4,recoil:.035,falloff:.85,description:'ยิงทีละนัด พร้อมกล้อง 4× ระยะไกล'}),
 gun('awm','AWM','SNIPER RIFLE',5,1.25,90,185,3.2,.0015,1,{auto:false,fixedScope:8,recoil:.065,falloff:.95,description:'สไนเปอร์กล้อง 8× ดาเมจสูง ต้องเว้นจังหวะขึ้นลำ'}),
 gun('deagle','DESERT EAGLE','PISTOL',7,.38,44,65,1.55,.015,1,{auto:false,scopes:[0,1],recoil:.03,description:'ปืนพกยิงทีละนัด พลังสูง'}),
 gun('m60','M60','MACHINE GUN',60,.12,27,110,3.3,.022,1,{recoil:.018,bloom:.18,description:'แม็กใหญ่ ยิงกดดันได้นาน เติมกระสุนช้า'}),
 gun('groza','GROZA','ASSAULT RIFLE',30,.11,28,98,2.0,.015,1,{recoil:.017,description:'ไรเฟิลทรงบูลพัป สีม่วงฟ้า ยิงต่อเนื่องระยะกลาง'}),
 gun('mag7','MAG-7','SHOTGUN',5,.40,10,28,2.1,.080,7,{scopes:[0],recoil:.030,falloff:.25,description:'ลูกซองทรงสั้น สีชมพูม่วง เหมาะระยะประชิด'})
];
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
// Longer exploration phase. Ring timing scales with the teacher's match duration.
export function zoneAt(time,duration=1200,radius=260){const phases=[{wait:.30,end:.43,r:.72},{wait:.55,end:.66,r:.43},{wait:.77,end:.86,r:.20},{wait:.92,end:1,r:.05}];let from=radius;for(let i=0;i<phases.length;i++){const p=phases[i],wait=p.wait*duration,end=p.end*duration,to=p.r*radius;if(time<wait)return{radius:from,shrinking:false,remaining:wait-time,phase:i+1};if(time<end)return{radius:from+(to-from)*(time-wait)/(end-wait),shrinking:true,remaining:end-time,phase:i+1};from=to}return{radius:radius*.05,shrinking:false,remaining:0,phase:5}}
export function canStand(x,z,solids,radius=.5){if(x*x+z*z>103*103)return false;return !solids.some(s=>Math.abs(x-s.x)<s.w+radius&&Math.abs(z-s.z)<s.d+radius)}
export function moveSlide(pos,dx,dz,solids){const originalX=pos.x,originalZ=pos.z;if(canStand(pos.x+dx,pos.z+dz,solids)){pos.x+=dx;pos.z+=dz}else{if(canStand(pos.x+dx,pos.z,solids))pos.x+=dx;if(canStand(pos.x,pos.z+dz,solids))pos.z+=dz}return Math.hypot(pos.x-originalX,pos.z-originalZ)}
export function applyDamage(hp,damage){return clamp(hp-Math.max(0,damage),0,100)}
export function reloadWeapon(weapon){const added=Math.min(Math.max(0,weapon.spec.mag-weapon.ammo),weapon.reserve);weapon.ammo+=added;weapon.reserve-=added;return added}
export function formatTime(t){return Math.floor(Math.max(0,t)/60)+':'+String(Math.floor(Math.max(0,t)%60)).padStart(2,'0')}

