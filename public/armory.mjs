import {WEAPONS} from './rules.mjs';
import {scopeName} from './combat.mjs';
import {WEAPON_STYLES} from './visuals.mjs';
export function setupArmory({practice,portrait}){
 const panel=document.getElementById('armory-panel'),list=document.getElementById('armory-list');let filter='ALL',selected=0,prior;
 const show=()=>{const w=WEAPONS[selected];document.getElementById('armory-name').textContent=w.name;document.getElementById('armory-kind').textContent=w.kind+' · '+WEAPON_STYLES[selected].name;document.getElementById('armory-description').textContent=w.description;
 document.getElementById('armory-stats').replaceChildren();for(const[label,value]of[['แม็กกาซีน',w.mag+' นัด'],['รูปแบบยิง',w.auto?'อัตโนมัติ':'ทีละนัด'],['กล้อง',w.fixedScope?scopeName(w.fixedScope):w.scopes.map(scopeName).join(' / ')],['เติมกระสุน',w.reload+' วินาที'],['ระยะในเกาะ',w.range+' ม.']]){const row=document.createElement('div'),name=document.createElement('span'),text=document.createElement('b');name.textContent=label;text.textContent=value;row.append(name,text);document.getElementById('armory-stats').append(row)}
 const outline=document.getElementById('armory-silhouette');outline.replaceChildren();const image=document.createElement('img');image.src=portrait(selected);image.alt='โมเดล 3 มิติ '+w.name;outline.append(image);outline.className='gun-silhouette '+(w.kind==='PISTOL'?'pistol':w.kind==='SHOTGUN'?'shotgun':w.kind==='SNIPER RIFLE'||w.fixedScope?'sniper':w.kind==='SUBMACHINE GUN'?'smg':'rifle');
 for(const button of list.children){const active=Number(button.dataset.index)===selected;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active))}
 };
 const render=()=>{list.replaceChildren();WEAPONS.forEach((w,i)=>{if(filter!=='ALL'&&w.kind!==filter)return;const button=document.createElement('button');button.dataset.index=i;const name=document.createElement('b'),kind=document.createElement('small');name.textContent=w.name;kind.textContent=w.kind;button.append(name,kind);button.onclick=()=>{selected=i;show()};list.append(button)});if(![...list.children].some(b=>Number(b.dataset.index)===selected))selected=Number(list.firstChild.dataset.index);show()};
 const select=document.getElementById('armory-filter');for(const value of['ALL',...new Set(WEAPONS.map(w=>w.kind))]){const option=document.createElement('option');option.value=value;option.textContent=value==='ALL'?'ปืนทั้งหมด':value;select.append(option)}select.onchange=()=>{filter=select.value;render()};
 const close=()=>{panel.hidden=true;prior?.focus()};document.getElementById('armory-close').onclick=close;
 document.getElementById('open-armory').onclick=()=>{prior=document.activeElement;panel.hidden=false;document.getElementById('armory-close').focus();render()};
 document.getElementById('armory-practice').onclick=()=>{close();practice(selected)};
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}if(e.key==='Tab'){const nodes=[...panel.querySelectorAll('button,select')].filter(n=>!n.disabled&&n.getClientRects().length);if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus()}}});
 render();return{close};
}
