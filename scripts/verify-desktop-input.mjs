import assert from 'node:assert/strict';
import {bindDesktopMouse} from '../public/desktop-input.mjs';
import {makeMatch,setInput,tick} from '../public/engine.mjs';
const canvas=new EventTarget(),target=new EventTarget();
const event=(node,type,values={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,values);node.dispatchEvent(e)};
let fire=false,aim=false,toggle=false,playing=true,starts=0,presses=0;
const binding=bindDesktopMouse({canvas,target,canPlay:()=>playing,start:()=>starts++,primary:value=>{fire=value;if(value)presses++},secondary:value=>{if(toggle){if(value)aim=!aim}else aim=value}});
// A mouse chord has one pointerdown, two mousedowns and no pointerup until
// the last button is released. This is the regression reported in the clips.
event(canvas,'pointerdown',{pointerType:'mouse',button:2,buttons:2});event(canvas,'mousedown',{button:2,buttons:2});assert.equal(aim,true);
event(canvas,'mousedown',{button:0,buttons:3});assert.equal(fire,true);assert.equal(aim,true);
for(const weapon of[0,9]){const m=makeMatch({humans:[{id:'you'}]}),actor=m.entities.find(e=>e.id==='you');m.drop=0;actor.weapon=weapon;actor.weapons[weapon].owned=true;const ammo=actor.weapons[weapon].ammo;setInput(m,'you',{fire,aim,scoped:aim});tick(m,1/30);assert.equal(actor.weapons[weapon].ammo,ammo-1,'scoped automatic and single-shot weapons both fire')}
event(target,'mouseup',{button:0,buttons:2});assert.equal(fire,false);assert.equal(aim,true,'releasing left keeps right-button scope held');
event(canvas,'mousedown',{button:0,buttons:3});assert.equal(fire,true);assert.equal(presses,2,'a second left click produces a new trigger');
event(target,'mouseup',{button:2,buttons:1});assert.equal(aim,false);assert.equal(fire,true,'releasing right does not cancel left-button firing');event(target,'mouseup',{button:0,buttons:0});assert.equal(fire,false);
toggle=true;event(canvas,'mousedown',{button:2});event(target,'mouseup',{button:2});assert.equal(aim,true);event(canvas,'mousedown',{button:0});assert.equal(fire,true);event(target,'blur');assert.equal(fire,false);aim=false;
playing=false;const before=starts;event(canvas,'mousedown',{button:0});assert.equal(starts,before);assert.equal(fire,false);
playing=true;event(canvas,'pointerdown',{pointerType:'touch'});event(canvas,'mousedown',{button:0});assert.equal(fire,false,'touch compatibility events cannot duplicate touch-button shots');
event(canvas,'pointerdown',{pointerType:'mouse'});event(canvas,'mousedown',{button:0});assert.equal(fire,true);event(target,'pointercancel',{pointerType:'mouse'});assert.equal(fire,false);
binding.dispose();event(canvas,'mousedown',{button:0});assert.equal(fire,false);
console.log('Desktop input passed: right-hold + left-fire chord, independent button releases, repeated semi-auto clicks, toggle aim, pause, blur, touch isolation and scoped ammo consumption');
