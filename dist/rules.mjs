export const WEAPONS=[
{id:'ar',name:'AR-7',kind:'ASSAULT RIFLE',mag:30,rate:.15,damage:26,range:90,reload:1.65,spread:.012,pellets:1},
{id:'smg',name:'VECTOR',kind:'SUBMACHINE GUN',mag:35,rate:.08,damage:17,range:48,reload:1.4,spread:.025,pellets:1},
{id:'sg',name:'M-8',kind:'SHOTGUN',mag:6,rate:.7,damage:13,range:28,reload:2.1,spread:.07,pellets:7}
];
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const phases=[{wait:40,end:80,r:70},{wait:110,end:145,r:38},{wait:175,end:205,r:12},{wait:230,end:260,r:0}];
export function zoneAt(time){let from=108;for(let i=0;i<phases.length;i++){const p=phases[i];if(time<p.wait)return{radius:from,shrinking:false,remaining:p.wait-time,phase:i+1};if(time<p.end)return{radius:from+(p.r-from)*(time-p.wait)/(p.end-p.wait),shrinking:true,remaining:p.end-time,phase:i+1};from=p.r}return{radius:0,shrinking:false,remaining:0,phase:5}}
export function canStand(x,z,solids,radius=.5){if(x*x+z*z>103*103)return false;return !solids.some(s=>Math.abs(x-s.x)<s.w+radius&&Math.abs(z-s.z)<s.d+radius)}
export function moveSlide(pos,dx,dz,solids){const originalX=pos.x,originalZ=pos.z;if(canStand(pos.x+dx,pos.z+dz,solids)){pos.x+=dx;pos.z+=dz}else{if(canStand(pos.x+dx,pos.z,solids))pos.x+=dx;if(canStand(pos.x,pos.z+dz,solids))pos.z+=dz}return Math.hypot(pos.x-originalX,pos.z-originalZ)}
export function applyDamage(hp,damage){return clamp(hp-Math.max(0,damage),0,100)}
export function reloadWeapon(weapon){const added=Math.min(Math.max(0,weapon.spec.mag-weapon.ammo),weapon.reserve);weapon.ammo+=added;weapon.reserve-=added;return added}
export function formatTime(t){return Math.floor(Math.max(0,t)/60)+':'+String(Math.floor(Math.max(0,t)%60)).padStart(2,'0')}

