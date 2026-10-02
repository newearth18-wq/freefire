import assert from 'node:assert/strict';
import {setupMobileHud} from '../public/mobile-hud.mjs';
// Component fixture: no browser navigation or rendering.
class Node{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;this.hidden=false;this.dataset={};this.attributes={};this.listeners=[];this.className=''}
 append(...nodes){for(const node of nodes){node.remove();node.parentNode=this;this.children.push(node)}}
 remove(){if(this.parentNode){const nodes=this.parentNode.children;nodes.splice(nodes.indexOf(this),1);this.parentNode=null}}
 before(node){const p=this.parentNode,index=p.children.indexOf(this);node.remove();node.parentNode=p;p.children.splice(index,0,node)}
 replaceWith(node){this.before(node);this.remove()}
 setAttribute(key,value){this.attributes[key]=String(value)}
 addEventListener(type,fn,capture){this.listeners.push({type,fn,capture:!!capture})}
 matches(selector){if(selector.startsWith('#'))return this.id===selector.slice(1);if(selector.startsWith('.'))return this.className.split(' ').includes(selector.slice(1));if(selector.startsWith('[data-group='))return this.dataset.group===selector.match(/"([^"]+)"/)[1];return this.tagName.toLowerCase()===selector}
 querySelectorAll(selector){const parts=selector.split(','),out=[];for(const node of this.children){if(parts.some(p=>node.matches(p)))out.push(node);out.push(...node.querySelectorAll(selector))}return out}
 querySelector(selector){return this.querySelectorAll(selector)[0]??null}
 closest(selector){let node=this;while(node){if(node.matches(selector))return node;node=node.parentNode}return null}
 getClientRects(){let node=this;while(node){if(node.hidden)return[];node=node.parentNode}return[{}]}
 focus(){document.activeElement=this}
 click(){const parents=[];for(let p=this.parentNode;p;p=p.parentNode)parents.push(p);const event={target:this};for(const p of parents.toReversed())for(const l of p.listeners.filter(l=>l.type==='click'&&l.capture))l.fn(event);this.onclick?.(event);for(const p of parents)for(const l of p.listeners.filter(l=>l.type==='click'&&!l.capture))l.fn(event)}
}
const body=new Node('body');globalThis.document={body,activeElement:null,createElement:tag=>new Node(tag),createComment:()=>new Node('comment'),getElementById:id=>body.querySelector('#'+id),querySelector:selector=>body.querySelector(selector)};
function add(parent,tag,id,cls){const node=new Node(tag);node.id=id;node.className=cls??'';parent.append(node);return node}
const brand=add(body,'header','brand'),lobby=add(body,'section','lobby'),hud=add(body,'div','hud'),rail=add(lobby,'nav',null,'lobby-rail'),party=add(lobby,'aside',null,'lobby-party'),picker=add(lobby,'div',null,'map-picker');
add(rail,'button','open-wardrobe');add(party,'button','create-room');add(picker,'button','open-classroom');add(lobby,'button','practice');const weaponSlots=add(hud,'div',null,'weapon-slots');const weapon=add(weaponSlots,'button','slot-0');add(hud,'div',null,'scope-controls');const actions=add(hud,'div',null,'touch-actions');for(const id of['swap-touch','aim-touch','wall-touch'])add(actions,'button',id);const fire=add(actions,'button','fire-touch');const quiz=add(hud,'button','quiz-open');add(hud,'div',null,'class-tools-bar');add(hud,'div',null,'mission-hint');for(const id of['team-panel','quiz-progress','connection'])add(hud,'div',id);const utility=add(hud,'div',null,'utility'),sound=add(utility,'button','sound');add(utility,'button','pause');
const originals=[rail,party,weaponSlots,utility,...actions.children],parents=originals.map(n=>n.parentNode);let inGame=false,opened=0,closed=0,shots=0,questions=0,equips=0;
const ui=setupMobileHud({playing:()=>inGame,onOpen:()=>opened++,onClose:()=>closed++});fire.onclick=()=>shots++;quiz.onclick=()=>questions++;weapon.onclick=()=>{assert.equal(ui.modalOpen,false,'drawer closes before the weapon handler');equips++};
ui.setMobile(true);assert.equal(quiz.parentNode,hud);assert.equal(fire.parentNode,actions);assert.ok(rail.closest('#mobile-menu'));assert.ok(weapon.closest('#mobile-menu'));assert.equal(document.getElementById('slot-0'),weapon,'the original live control is moved, not duplicated');
document.getElementById('mobile-lobby-more').click();assert.equal(ui.modalOpen,true);assert.equal(document.getElementById('mobile-menu').dataset.context,'lobby');assert.equal(opened,1);assert.equal(questions,0,'opening a menu cannot open a question');ui.close();assert.equal(document.activeElement,document.getElementById('mobile-lobby-more'));
inGame=true;document.getElementById('mobile-game-more').click();assert.equal(document.getElementById('mobile-menu').dataset.context,'game');weapon.click();assert.equal(equips,1);assert.equal(closed,2);assert.equal(ui.modalOpen,false);quiz.click();assert.equal(questions,1);fire.click();assert.equal(shots,1);
document.getElementById('mobile-game-more').click();sound.click();assert.equal(ui.modalOpen,true,'sound toggles do not dismiss the settings');ui.setMobile(false);assert.equal(ui.modalOpen,false);originals.forEach((node,i)=>assert.equal(node.parentNode,parents[i],'desktop controls return to their original containers'));weapon.click();assert.equal(equips,2,'original handlers survive viewport changes');ui.setMobile(true);ui.setMobile(true);assert.equal(body.querySelectorAll('#slot-0').length,1);ui.destroy();assert.equal(body.querySelector('#mobile-menu'),null);
console.log('Mobile HUD passed: responsive relocation and restoration, retained IDs/handlers, modal state, action ordering, focus restoration and manual-only quiz access');
