import {WEAPONS} from './rules.mjs';
import {lineClear} from './arena.mjs';

export const WEAPON_PICKUP_RANGE=4;
export function loadAutoPickup(storage){try{return(storage??globalThis.localStorage).getItem('lastIsland.autoPickup')!=='off'}catch{return true}}
export function saveAutoPickup(storage,enabled){try{(storage??globalThis.localStorage).setItem('lastIsland.autoPickup',enabled?'on':'off')}catch{}}
// Shared by the HUD and authoritative simulation. Never pick through cover,
// from a different floor, during parachuting, or consume useless duplicates.
export function nearbyWeaponItems(match,actor,solids,range=WEAPON_PICKUP_RANGE){
 if(!actor||actor.status!=='alive'||match.state!=='playing'||match.drop>0)return [];
 const found=[];
 const eye={x:actor.x,y:actor.y+1,z:actor.z};
 for(const item of match.loot){
  if(item.type!=='weapon'||!WEAPONS[item.weapon])continue;
  const inventory=actor.weapons[item.weapon];if(!inventory||inventory.owned&&(match.educational||inventory.reserve>=360))continue;
  const dx=item.x-actor.x,dz=item.z-actor.z,distance=dx*dx+dz*dz;
  if(distance>Math.min(range,WEAPON_PICKUP_RANGE)**2||Math.abs(item.y-actor.y)>1.6)continue;
  if(!lineClear(eye,{x:item.x,y:item.y+.7,z:item.z},solids))continue;
  found.push({item,rank:inventory.owned?1:0,distance});
 }
 return found.sort((a,b)=>a.rank-b.rank||a.distance-b.distance||a.item.id-b.item.id).map(entry=>entry.item);
}
export function nearbyWeaponLoot(match,actor,solids,requestedId){
 if(requestedId!==undefined&&!Number.isInteger(requestedId))return null;
 const items=nearbyWeaponItems(match,actor,solids);return(requestedId===undefined?items[0]:items.find(item=>item.id===requestedId))??null;
}

export function setupPickupPrompt({button,onPickup,onEmpty,now=()=>performance.now()}){
 let item=null,readyAt=0,lastPointer=-Infinity;
 const name=button.querySelector('b'),hint=button.querySelector('small');
 function pick(next=item){if(!next){onEmpty?.();return false}if(now()<readyAt)return false;const id=next.id;readyAt=now()+350;button.disabled=true;onPickup(id);return true}
 button.addEventListener('pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;lastPointer=now();event.preventDefault();event.stopPropagation();pick()});
 // Pointer press already committed the displayed item. Click remains available
 // for keyboard/assistive activation without issuing a duplicate pickup.
 button.onclick=()=>{if(now()-lastPointer<350)return;pick()};
 return{pick,get ready(){return now()>=readyAt},update(next,actor,touch=false){item=next;button.hidden=!item;button.disabled=now()<readyAt;if(!item)return;const spec=WEAPONS[item.weapon],owned=actor.weapons[item.weapon].owned,full=actor.weapons.filter(w=>w.owned).length>=3,distance=Math.hypot(item.x-actor.x,item.z-actor.z);name.textContent=spec.name+' · '+distance.toFixed(1)+' ม.';hint.textContent=(owned?'รับกระสุน':full?'แทน '+WEAPONS[actor.weapon].name:'เก็บปืน')+' · '+(touch?'แตะ':'H');button.setAttribute('aria-label',hint.textContent+' '+name.textContent)}};
}

export function setupNearbyWeapons({toggle,panel,list,closeButton,prompt,onOpen=()=>{},onClose=()=>{},create=tag=>document.createElement(tag),now=()=>performance.now()}){
 let opened=false,stamp='',items=[],actor=null;const buttons=new Map();
 function close(){const wasOpen=opened;opened=false;panel.hidden=true;toggle.setAttribute('aria-expanded','false');if(wasOpen)onClose()}
 function change(){if(!items.length)return;if(opened){close();return}opened=true;panel.hidden=false;toggle.setAttribute('aria-expanded','true');onOpen();closeButton.focus()}
 toggle.onclick=change;closeButton.onclick=()=>{close();toggle.focus()};
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();close();toggle.focus()}});
 return{close,toggle:change,get open(){return opened},update(next,current){items=next;actor=current;toggle.hidden=!items.length;toggle.textContent='ปืนใกล้ตัว · '+items.length;if(!items.length){close();return}panel.hidden=!opened;
  const key=items.map(item=>item.id+':'+actor.weapons[item.weapon].owned).join(',')+':'+actor.weapon+':'+actor.weapons.filter(w=>w.owned).length;
  if(key!==stamp){stamp=key;list.replaceChildren();buttons.clear();for(const entry of items){const button=create('button'),name=create('b'),hint=create('small');button.type='button';button.append(name,hint);let pointerAt=-Infinity;const pick=()=>{const candidate=items.find(item=>item.id===entry.id);if(candidate&&prompt.pick(candidate)){close();toggle.focus()}};button.addEventListener('pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;pointerAt=now();event.preventDefault();event.stopPropagation();pick()});button.onclick=()=>{if(now()-pointerAt>=350)pick()};list.append(button);buttons.set(entry.id,{button,name,hint})}}
  for(const entry of items){const row=buttons.get(entry.id),owned=actor.weapons[entry.weapon].owned,full=actor.weapons.filter(w=>w.owned).length>=3;row.name.textContent=WEAPONS[entry.weapon].name+' · '+Math.hypot(entry.x-actor.x,entry.z-actor.z).toFixed(1)+' ม.';row.hint.textContent=owned?'รับกระสุน':full?'เก็บแทน '+WEAPONS[actor.weapon].name:'เก็บเข้าช่องว่าง';row.button.disabled=!prompt.ready}
 }};
}
