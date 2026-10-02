import assert from 'node:assert/strict';
import {bindMobilePointers} from '../public/mobile-input.mjs';
class Surface{
 constructor(){this.listeners=new Map();this.style={};this.captured=[]}
 addEventListener(name,handler){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push(handler)}
 setPointerCapture(id){this.captured.push(id)}
 getBoundingClientRect(){return{left:10,top:20,width:100,height:100}}
 emit(name,pointerId,x=60,y=70,button=0){const e={pointerId,clientX:x,clientY:y,button,preventDefault(){},stopPropagation(){}};for(const handler of this.listeners.get(name)??[])handler(e)}
}
const joystick=new Surface(),lookArea=new Surface(),fireButton=new Surface(),events=new Surface(),stick=new Surface();let move={},aim=[],firing=false,shots=0,enabled=true;
const input=bindMobilePointers({joystick,stick,lookArea,fireButton,events,active:()=>enabled,onMove:v=>move=v,onLook:(x,y)=>aim.push([x,y]),onFire:v=>{firing=v;if(v)shots++}});
joystick.emit('pointerdown',1,60,68);assert.deepEqual(move,{x:0,y:0},'small finger jitter stays in the dead zone');
joystick.emit('pointermove',1,60,20);assert.deepEqual(move,{x:0,y:-1});
joystick.emit('pointerdown',2,110,70);assert.deepEqual(move,{x:0,y:-1},'a second finger cannot steal walking');
fireButton.emit('pointerdown',3,210,120);assert.equal(firing,true);assert.equal(shots,1);assert.equal(move.y,-1,'walking continues while firing');
fireButton.emit('pointerdown',4,220,130);assert.equal(shots,1,'a second fire press cannot double issue actions');
events.emit('pointermove',3,220,125);assert.deepEqual(aim.at(-1),[10,5],'dragging the fire button also aims');
events.emit('pointerup',2);assert.equal(move.y,-1);assert.equal(firing,true,'unrelated finger releases do not stop owned controls');
joystick.emit('lostpointercapture',1);assert.deepEqual(move,{x:0,y:0});assert.equal(stick.style.transform,'');assert.equal(firing,true,'lost joystick capture stops walking only');
fireButton.emit('lostpointercapture',3);assert.equal(firing,false);const count=aim.length;events.emit('pointermove',3,250,130);assert.equal(aim.length,count);
lookArea.emit('pointerdown',5,200,100);fireButton.emit('pointerdown',6,300,180);events.emit('pointermove',6,330,200);assert.equal(aim.length,count,'fire cannot hijack an existing camera finger');
events.emit('pointermove',5,210,110);assert.deepEqual(aim.at(-1),[10,10]);events.emit('pointercancel',6);assert.equal(firing,false);events.emit('pointermove',5,215,114);assert.deepEqual(aim.at(-1),[5,4],'releasing fire leaves camera drag intact');
input.reset();const resets=aim.length;events.emit('pointermove',5,300,150);assert.equal(aim.length,resets);assert.equal(firing,false);assert.deepEqual(move,{x:0,y:0});
enabled=false;joystick.emit('pointerdown',7,60,20);fireButton.emit('pointerdown',8,0,0);lookArea.emit('pointerdown',9,0,0);assert.deepEqual(move,{x:0,y:0});assert.equal(firing,false,'paused/menu state does not acquire controls');
enabled=true;joystick.emit('pointerdown',10,110,20);assert.ok(Math.hypot(move.x,move.y)<=1.00001,'diagonal speed is bounded');events.emit('pointercancel',10);assert.deepEqual(move,{x:0,y:0});
console.log('Mobile controls passed: independent walking/looking/firing fingers, capture loss, cancellation, dead zone, modal reset, no duplicate fire and bounded diagonals');
