import {ACTIVE_MAP,STATIC_SOLIDS,canStand,groundHeight,walkHeight,lineClear,moveSlide} from './arena.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const VEHICLE_RADIUS=1.45,MAX_DRIVE_SPEED=23;
export function createVehicles(){
 const list=[],points=[[-9,34],[10,-30],[-9,-105],[10,105],[-105,-14],[105,-2],[-9,-210],[10,210],[-210,-14],[210,-2]];
 for(const[x,z]of points){if(Math.hypot(x,z)>ACTIVE_MAP.playRadius*.85||!canStand(x,z,STATIC_SOLIDS,VEHICLE_RADIUS,groundHeight(x,z)))continue;list.push({id:list.length,x,z,y:groundHeight(x,z),yaw:Math.PI,speed:0,seats:[],color:list.length%3})}return list;
}
export function nearestVehicle(m,e){if(e.status!=='alive'||m.drop>0)return null;return(m.vehicles??[]).filter(v=>Math.hypot(v.x-e.x,v.z-e.z)<4.5&&Math.abs(v.y-e.y)<1.8&&(!v.seats?.length||m.mode==='squad'&&m.entities.find(a=>a.id===v.seats[0])?.team===e.team&&v.seats.length<5)&&lineClear({x:e.x,y:e.y+1,z:e.z},{x:v.x,y:v.y+1,z:v.z},STATIC_SOLIDS)).sort((a,b)=>Math.hypot(a.x-e.x,a.z-e.z)-Math.hypot(b.x-e.x,b.z-e.z))[0]??null}
export function leaveVehicle(m,e,solids=STATIC_SOLIDS){
 const v=m.vehicles?.find(v=>v.id===e.vehicleId);if(!v){delete e.vehicleId;return true}
 solids=solids.filter(s=>s.vehicle!==v.id);
 // Stop before dismounting. Never place a player through a wall or outside the island.
 let exit=null;exitSearch:for(const radius of[2.8,3.5,4.2])for(let i=0;i<12;i++){const a=v.yaw+i/12*Math.PI*2,x=v.x+Math.cos(a)*radius,z=v.z+Math.sin(a)*radius,y=walkHeight(x,z,v.y);if(canStand(x,z,solids,.45,y)&&lineClear({x:v.x,y:v.y+1.4,z:v.z},{x,y:y+1.4,z},solids)){exit={x,z,y};break exitSearch}}if(!exit)return false;
 v.speed=0;v.seats=v.seats.filter(id=>id!==e.id);delete e.vehicleId;e.jump=e.vy=0;Object.assign(e,exit,{floorY:exit.y,speed:0,vx:0,vz:0});return true;
}
export function toggleVehicle(m,e,id,solids=STATIC_SOLIDS){
 if(e.vehicleId!==undefined)return leaveVehicle(m,e,solids);
 const v=nearestVehicle(m,e);if(!v||id!==undefined&&v.id!==id||Math.abs(v.speed)>3)return false;
 v.seats.push(e.id);e.vehicleId=v.id;e.jump=e.vy=e.heal=e.reload=0;e.crouch=e.aim=e.scoped=e.triggerHeld=false;seatActor(v,e);return true;
}
export function seatActor(v,e){const seat=v.seats.indexOf(e.id),x=seat===0?-.48:seat===1?.48:(seat-3)*.48,z=seat<2?-.45:.7;const c=Math.cos(v.yaw),s=Math.sin(v.yaw);e.x=v.x+x*c+z*s;e.z=v.z-x*s+z*c;e.y=v.y+.56;e.floorY=e.y;e.yaw=v.yaw;e.speed=0;e.vx=-s*v.speed;e.vz=-c*v.speed}
export function driveVehicle(v,input,dt,solids=STATIC_SOLIDS){
 dt=clamp(dt,0,.05);const throttle=clamp(-(input.mz??0),-1,1),target=throttle*(throttle<0?8:MAX_DRIVE_SPEED),brake=input.brake===true,rate=brake?32:throttle?12:7;
 v.speed+=(clamp(target-v.speed,-rate*dt,rate*dt));if(brake)v.speed+=(clamp(-v.speed,-32*dt,32*dt));
 const steer=clamp(input.mx??0,-1,1);v.yaw-=steer*dt*1.5*clamp(Math.abs(v.speed)/9,0,1)*Math.sign(v.speed||1);v.steer=steer;if(Math.abs(v.speed)<.001){v.speed=0;return 0}
 const distance=v.speed*dt,steps=Math.max(1,Math.ceil(Math.abs(distance)/.25));let moved=0;
 for(let n=0;n<steps;n++){const dx=-Math.sin(v.yaw)*distance/steps,dz=-Math.cos(v.yaw)*distance/steps,x=v.x+dx,z=v.z+dz,y=groundHeight(x,z);if(Math.abs(y-v.y)>1||!canStand(x,z,solids,VEHICLE_RADIUS,y)){v.speed=0;break}const oldX=v.x,oldZ=v.z;moveSlide(v,dx,dz,solids,VEHICLE_RADIUS);moved+=Math.hypot(v.x-oldX,v.z-oldZ);v.y=groundHeight(v.x,v.z)}return moved;
}
export function tickVehicles(m,dt,solids){for(const v of m.vehicles??[]){v.seats=v.seats.filter(id=>{const e=m.entities.find(e=>e.id===id);if(!e||e.status!=='alive'||e.vehicleId!==v.id){if(e?.vehicleId===v.id)leaveVehicle(m,e,solids);return false}return true});const driver=m.entities.find(e=>e.id===v.seats[0]),studying=driver&&m.time<(driver.studyUntil??0)&&(!driver.studyDeadline||Date.now()<driver.studyDeadline);driveVehicle(v,studying?{brake:true}:driver&&m.time-driver.lastInput<=1?driver.input:{},dt,solids.filter(s=>s.vehicle!==v.id));for(const id of v.seats){const e=m.entities.find(e=>e.id===id);if(e)seatActor(v,e)}}}
// The same constrained driving calculation predicts the local driver's presentation.
export class VehiclePredictor{
 constructor(){this.vehicle=null;this.error={x:0,z:0}}
 receive(v,input,lag,solids){if(!v){this.vehicle=null;return}const next=structuredClone(v);for(let remain=Math.min(.25,lag);remain>0;remain-=.05)driveVehicle(next,input,Math.min(.05,remain),solids);if(!this.vehicle||this.vehicle.id!==v.id||Math.hypot(next.x-this.vehicle.x,next.z-this.vehicle.z)>6){this.vehicle=next;this.error={x:0,z:0};return}this.error={x:next.x-this.vehicle.x,z:next.z-this.vehicle.z};this.vehicle.speed=next.speed;this.vehicle.yaw=next.yaw;this.vehicle.seats=[...v.seats]}
 step(v,input,dt,solids,active=true){if(!this.vehicle||this.vehicle.id!==v.id){this.vehicle=structuredClone(v);this.error={x:0,z:0}}if(!active){this.vehicle=structuredClone(v);return this.vehicle}driveVehicle(this.vehicle,input,dt,solids);const blend=1-Math.exp(-dt*7);moveSlide(this.vehicle,this.error.x*blend,this.error.z*blend,solids,VEHICLE_RADIUS);this.error.x*=1-blend;this.error.z*=1-blend;this.vehicle.y=groundHeight(this.vehicle.x,this.vehicle.z);return this.vehicle}
}
