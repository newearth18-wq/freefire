import {WEAPONS} from './rules.mjs';
import {lineClear} from './arena.mjs';

export const WEAPON_PICKUP_RANGE=4;
// Shared by the HUD and authoritative simulation. Never pick through cover,
// from a different floor, during parachuting, or consume useless duplicates.
export function nearbyWeaponLoot(match,actor,solids,requestedId){
 if(!actor||actor.status!=='alive'||match.state!=='playing'||match.drop>0)return null;
 if(requestedId!==undefined&&!Number.isInteger(requestedId))return null;
 let best=null,bestRank=Infinity,bestDistance=Infinity;
 const eye={x:actor.x,y:actor.y+1,z:actor.z};
 for(const item of match.loot){
  if(item.type!=='weapon'||!WEAPONS[item.weapon]||requestedId!==undefined&&item.id!==requestedId)continue;
  const inventory=actor.weapons[item.weapon];if(!inventory||inventory.owned&&(match.educational||inventory.reserve>=360))continue;
  const dx=item.x-actor.x,dz=item.z-actor.z,distance=dx*dx+dz*dz;
  if(distance>WEAPON_PICKUP_RANGE**2||Math.abs(item.y-actor.y)>1.6)continue;
  const rank=inventory.owned?1:0;if(rank>bestRank||rank===bestRank&&distance>=bestDistance)continue;
  if(!lineClear(eye,{x:item.x,y:item.y+.7,z:item.z},solids))continue;
  best=item;bestRank=rank;bestDistance=distance;
 }
 return best;
}

export function setupPickupPrompt({button,onPickup,onEmpty,now=()=>performance.now()}){
 let item=null,readyAt=0,lastPointer=-Infinity;
 const name=button.querySelector('b'),hint=button.querySelector('small');
 function pick(){if(!item){onEmpty?.();return false}if(now()<readyAt)return false;const id=item.id;readyAt=now()+350;button.disabled=true;onPickup(id);return true}
 button.addEventListener('pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;lastPointer=now();event.preventDefault();event.stopPropagation();pick()});
 // Pointer press already committed the displayed item. Click remains available
 // for keyboard/assistive activation without issuing a duplicate pickup.
 button.onclick=()=>{if(now()-lastPointer<350)return;pick()};
 return{pick,update(next,actor,touch=false){item=next;button.hidden=!item;button.disabled=now()<readyAt;if(!item)return;const spec=WEAPONS[item.weapon],owned=actor.weapons[item.weapon].owned,full=actor.weapons.filter(w=>w.owned).length>=3,distance=Math.hypot(item.x-actor.x,item.z-actor.z);name.textContent=spec.name+' · '+distance.toFixed(1)+' ม.';hint.textContent=(owned?'รับกระสุน':full?'แทน '+WEAPONS[actor.weapon].name:'เก็บปืน')+' · '+(touch?'แตะ':'H');button.setAttribute('aria-label',hint.textContent+' '+name.textContent)}};
}
