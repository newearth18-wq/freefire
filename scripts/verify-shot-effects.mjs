import assert from 'node:assert/strict';
import * as T from '../public/vendor/three.module.js';
import {HeartShotEffects,RAINBOW} from '../public/shot-effects.mjs';
const scene=new T.Scene(),camera=new T.PerspectiveCamera();camera.position.set(0,2,5);camera.lookAt(0,1,0);camera.updateMatrixWorld();
const fx=new HeartShotEffects(scene),geometries=scene.children.map(o=>o.geometry);
assert.equal(scene.children.length,2,'all shots share two GPU draw calls');assert.equal(RAINBOW.length,7);
for(let i=0;i<600;i++)fx.emit({x:0,y:1,z:0},{x:i%10,y:1,z:-20},camera.position);
fx.update(1/60,camera);assert.equal(fx.slots.length,48);assert.ok(fx.slots.every(s=>s.left>0));
for(const mesh of scene.children){assert.ok(mesh.instanceMatrix.array.every(Number.isFinite));assert.ok(mesh.geometry.attributes.fxAlpha.array.some(a=>a>0));}
fx.update(.4,camera);assert.ok(scene.children.every(o=>!o.visible));assert.ok(scene.children.every(o=>o.geometry.attributes.fxAlpha.array.every(a=>a===0)));
assert.equal(fx.emit({x:NaN,y:1,z:0},{x:0,y:1,z:0}),false);assert.equal(fx.emit({x:999,y:1,z:0},{x:1000,y:1,z:0},camera.position),false);
assert.equal(fx.emit({x:0,y:1,z:0},{x:0,y:1,z:0}),true);fx.update(.01,camera);assert.ok(scene.children.every(o=>o.instanceMatrix.array.every(Number.isFinite)),'zero-length impact remains valid');
fx.clear();assert.ok(scene.children.every(o=>!o.visible));assert.ok(scene.children.every((o,i)=>o.geometry===geometries[i]),'clearing a round preserves cached GPU geometry');
fx.dispose();assert.equal(scene.children.length,0);
console.log('Shot effects passed: rainbow and hearts, 600-shot bounded pool, two draw calls, expiry, distance culling, degenerate rays and cleanup');
