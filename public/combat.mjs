import {cameraPosition} from './arena.mjs';
// Weapon behavior uses locally tuned values; magnification is optical, not a crop.
import {WEAPONS,clamp} from './rules.mjs';
export const SCOPES=[0,1,2,4,8];
export const scopeName=value=>value===0?'ศูนย์เหล็ก':value===1?'เรดดอต':value+'×';
export function ownedWeapons(actor){return actor.weapons.flatMap((w,i)=>w.owned?[i]:[])}
export function scopeOptions(actor){const spec=WEAPONS[actor.weapon];return spec.fixedScope?[spec.fixedScope]:spec.scopes.filter(s=>(actor.scopes??[0,1]).includes(s))}
export function equippedScope(actor){const options=scopeOptions(actor);return options.includes(actor.scope)?actor.scope:options.at(-1)??0}
export function scopeFov(scope){return scope===0?46:scope===1?42:2*Math.atan(Math.tan(Math.PI/6)/scope)*180/Math.PI}
export function shotSpread(actor){const spec=WEAPONS[actor.weapon];return spec.spread*(actor.aim?.35:1)*(actor.crouch?.7:1)*(actor.jump>0?2.8:1)*(1+Math.min(1,(actor.speed??0)/8)*.7+(actor.bloom??0))}
export function rangeDamage(spec,distance){const start=spec.range*.35,t=clamp((distance-start)/(spec.range-start),0,1);return 1-t*(1-spec.falloff)}
export const DEFAULT_SENSITIVITY={general:100,red:75,two:60,four:45,eight:28};
export function sensitivityKey(scope,aim){return !aim?'general':scope<=1?'red':scope===2?'two':scope===4?'four':'eight'}
export function aimingPoint(actor,solids){return{x:actor.x-Math.sin(actor.yaw)*.12,y:actor.y+(actor.crouch?1.25:1.65),z:actor.z-Math.cos(actor.yaw)*.12}}
export function aimAssistDelta(match,actor,yaw,pitch,solids,lineClear,dt){
 if(actor.status!=='alive'||actor.reload>0||actor.jump>0)return null;
 let best=null,score=.055;const maxRange=Math.min(65,WEAPONS[actor.weapon].range);
 const eye=actor.scoped?aimingPoint({...actor,yaw},solids):cameraPosition({...actor,yaw,aim:true},solids);
 for(const target of match.entities){if(target.team===actor.team||target.status!=='alive')continue;const dx=target.x-eye.x,dz=target.z-eye.z,d=Math.hypot(dx,dz);if(d<2||d>maxRange)continue;
 const goal={x:target.x,y:target.y+(target.crouch?1.15:1.4),z:target.z},wantedYaw=Math.atan2(-dx,-dz),wantedPitch=Math.atan2(goal.y-eye.y,d),dy=Math.atan2(Math.sin(wantedYaw-yaw),Math.cos(wantedYaw-yaw)),dp=wantedPitch-pitch,error=Math.hypot(dy,dp);
 if(error>=score||!lineClear(eye,goal,solids))continue;score=error;best={yaw:dy,pitch:dp};
 }
 if(!best)return null;const fraction=Math.min(.12,dt*2.5);return{yaw:best.yaw*fraction,pitch:best.pitch*fraction};
}
