import {mapInfo} from './maps.mjs';
const BASE_BUILDINGS=[
[-27,-23,10,9,'house'],[-10,-26,8,8,'house'],[11,-27,10,8,'house'],[28,-21,9,10,'house'],
[-30,-5,9,8,'house'],[29,-2,11,8,'house'],[-27,16,10,8,'house'],[27,20,10,9,'house'],
[-62,-42,16,12,'warehouse'],[-42,-57,9,8,'house'],[50,-45,9,8,'house'],[66,-34,11,10,'house'],
[-56,47,10,8,'house'],[-40,61,8,9,'house'],[48,47,16,13,'warehouse'],[66,55,10,8,'house']
];
export function seeded(seed=18){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export let ACTIVE_MAP=mapInfo('dawn'),BUILDINGS=[],DECOR=[],STATIC_SOLIDS=[];
const cache=new Map();
function rawHeight(x,z){const factor=ACTIVE_MAP.radius/124;x/=factor;z/=factor;const r=Math.hypot(x,z),coast=clamp((124-r)/12,0,1),hills=clamp((r-40)/23,0,1);if(r>124)return-2;return(ACTIVE_MAP.hills+Math.sin(x*.047)*Math.cos(z*.075)*3+Math.sin((x+z)*.04)*2)*hills*coast-(1-coast)*1.7}
export function groundHeight(x,z){let h=rawHeight(x,z);for(const b of BUILDINGS){const m=Math.max(Math.abs(x-b.x)-b.w/2,Math.abs(z-b.z)-b.d/2);if(m<5){const mix=clamp(m/5,0,1);h=rawHeight(b.x,b.z)*(1-mix)+h*mix}}if(Math.abs(x)<4.5&&Math.abs(z)<ACTIVE_MAP.playRadius*.8||Math.abs(z+8)<3.5&&Math.abs(x)<ACTIVE_MAP.playRadius*.8)h=0;return h}
export function activateMap(id='dawn'){const next=mapInfo(id);if(cache.has(next.id)){({map:ACTIVE_MAP,buildings:BUILDINGS,decor:DECOR,solids:STATIC_SOLIDS}=cache.get(next.id));return ACTIVE_MAP}ACTIVE_MAP=next;BUILDINGS=[];DECOR=[];STATIC_SOLIDS=[];
 const random=seeded(next.seed),scale=next.radius/124;
 if(next.id==='dawn')BUILDINGS=BASE_BUILDINGS.map(([x,z,w,d,type],i)=>({x:x*scale,z:z*scale,w,d,type,id:i}));
 else for(let i=0;i<28;i++){const angle=i/28*Math.PI*2,r=next.radius*(i%2?.65:.38),x=Math.sin(angle)*r,z=Math.cos(angle)*r;BUILDINGS.push({id:i,x,z,w:i%5===0?16:8+i%3,d:i%5===0?12:8+i%2,type:i%5===0?'warehouse':'house'})}

function rect(x,z,w,d,h,y=groundHeight(x,z),type='wall'){STATIC_SOLIDS.push({x,z,w:w/2,d:d/2,h,y,type})}
for(const b of BUILDINGS){const h=b.type==='warehouse'?5:3.7;for(const side of[-1,1]){rect(b.x+side*b.w/2,b.z,.3,b.d,h,groundHeight(b.x,b.z));for(const front of[-1,1]){const door=b.type==='warehouse'?3.2:2.2,section=(b.w-door)/2,sx=side*(b.w+door)/4;rect(b.x+sx,b.z+front*b.d/2,section,.3,h,groundHeight(b.x,b.z));}}rect(b.x-b.w*.3,b.z+b.d*.23,1.2,1.2,1.05,groundHeight(b.x,b.z),'crate')}
for(const b of BUILDINGS){const y=groundHeight(b.x,b.z),h=b.type==='warehouse'?5:3.7,door=b.type==='warehouse'?3.2:2.2;for(const front of[-1,1])rect(b.x,b.z+front*b.d/2,door,.3,h-2.9,y+2.9);rect(b.x,b.z,b.w,b.d,.18,y+h,'roof')}
rect(-13,8,2.5,6.7,2.9,0,'truck');
for(let i=0;i<75;i++){const x=(random()-.5)*ACTIVE_MAP.playRadius*1.7,z=(random()-.5)*ACTIVE_MAP.playRadius*1.7;if(Math.hypot(x,z)<17||STATIC_SOLIDS.some(s=>Math.abs(x-s.x)<s.w+3&&Math.abs(z-s.z)<s.d+3))continue;const w=1.6+random()*1.6,d=1.5+random(),h=1.4;DECOR.push({type:'crate',x,z,w,d,h});rect(x,z,w,d,h,groundHeight(x,z),'crate')}
for(let i=0;i<200;i++){const a=random()*Math.PI*2,r=40+random()*(ACTIVE_MAP.playRadius-52),x=Math.cos(a)*r,z=Math.sin(a)*r;if(STATIC_SOLIDS.some(s=>Math.abs(x-s.x)<s.w+3&&Math.abs(z-s.z)<s.d+3)||Math.abs(x)<5||Math.abs(z+8)<4)continue;const height=.8+random()*.55;DECOR.push({type:'tree',x,z,h:height});rect(x,z,.62,.62,8,groundHeight(x,z),'tree')}
cache.set(next.id,{map:ACTIVE_MAP,buildings:BUILDINGS,decor:DECOR,solids:STATIC_SOLIDS});return ACTIVE_MAP;}
activateMap();
export function canStand(x,z,solids=STATIC_SOLIDS,radius=.45,feet=0){if(Math.hypot(x,z)>ACTIVE_MAP.playRadius)return false;return !solids.some(s=>Math.abs(x-s.x)<s.w+radius&&Math.abs(z-s.z)<s.d+radius&&feet+2>s.y+.05&&feet<=s.y+s.h-.05)}
export function moveSlide(p,dx,dz,solids=STATIC_SOLIDS,radius=.45){const ox=p.x,oz=p.z,feet=(p.y??groundHeight(p.x,p.z))+.05;if(canStand(p.x+dx,p.z+dz,solids,radius,feet)){p.x+=dx;p.z+=dz}else{if(canStand(p.x+dx,p.z,solids,radius,feet))p.x+=dx;if(canStand(p.x,p.z+dz,solids,radius,feet))p.z+=dz}return Math.hypot(p.x-ox,p.z-oz)}
export function rayBox(origin,dir,b,max=150){let low=0,high=max;for(let axis=0;axis<3;axis++){const name=axis===0?'x':axis===1?'y':'z',min=axis===0?b.x-b.w:axis===1?b.y:b.z-b.d,bound=axis===0?b.x+b.w:axis===1?b.y+b.h:b.z+b.d,v=dir[name],o=origin[name];if(Math.abs(v)<1e-8){if(o<min||o>bound)return null}else{let a=(min-o)/v,c=(bound-o)/v;if(a>c){const swap=a;a=c;c=swap}if(a>low)low=a;if(c<high)high=c;if(low>high)return null}}return low}
export function lineClear(a,b,solids=STATIC_SOLIDS){const d=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);if(d<.01)return true;const dir={x:(b.x-a.x)/d,y:(b.y-a.y)/d,z:(b.z-a.z)/d};return !solids.some(s=>rayBox(a,dir,s,d-.2)!==null)}
export function cameraPosition(e,solids=STATIC_SOLIDS){const distance=e.aim?3.8:6.2,anchor={x:e.x,y:e.y+1.65,z:e.z},camera={x:e.x+Math.sin(e.yaw)*distance+Math.cos(e.yaw)*.62,y:e.y+(e.crouch?2.05:2.55),z:e.z+Math.cos(e.yaw)*distance-Math.sin(e.yaw)*.62};const length=Math.hypot(camera.x-anchor.x,camera.y-anchor.y,camera.z-anchor.z),dir={x:(camera.x-anchor.x)/length,y:(camera.y-anchor.y)/length,z:(camera.z-anchor.z)/length};let nearest=length;for(const s of solids){const d=rayBox(anchor,dir,s,length);if(d!==null)nearest=Math.min(nearest,d)}if(nearest<length){const d=Math.max(.15,nearest-.3);camera.x=anchor.x+dir.x*d;camera.y=anchor.y+dir.y*d;camera.z=anchor.z+dir.z*d}return camera}
