import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from '../public/vendor/three.module.js';
import {GLTFLoader} from '../public/vendor/addons/loaders/GLTFLoader.js';
import {prepareCharacter,makeAvatar,animateAvatar,disposeAvatar} from '../public/visuals.mjs';
const bytes=await readFile(new URL('../public/models/operative.glb',import.meta.url));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
prepareCharacter(gltf);
const avatars=[makeAvatar(0),makeAvatar(1)],point=new T.Vector3();
for(const avatar of avatars){let meshes=0;avatar.userData.model.traverse(o=>{if(o.isSkinnedMesh){meshes++;assert.equal(o.geometry.index.count/3,10202,'merging preserves every character triangle');assert.equal(o.skeleton.bones.length,62);assert.ok(o.geometry.attributes.color)}});assert.equal(meshes,1,'the full character uses one draw call');
 for(const speed of[0,5.4])for(let frame=0;frame<90;frame++){animateAvatar(avatar,{status:'alive',speed,crouch:false,pitch:0},1/60);avatar.updateMatrixWorld(true);avatar.userData.model.getObjectByName('WristR').getWorldPosition(point);assert.ok(point.distanceTo(avatar.userData.gun.position)<.4,'baked weapon anchor remains at the right hand');assert.ok(Number.isFinite(point.y)&&point.y>.5&&point.y<2.5,'animated skeleton has a valid standing pose')}
 animateAvatar(avatar,{status:'down',speed:0,crouch:false},.1);assert.equal(avatar.userData.gun.visible,false);
 for(let i=0;i<100;i++)animateAvatar(avatar,{status:'dead',speed:0,crouch:false},.05);
 assert.ok(avatar.userData.actions.Death.clampWhenFinished);
}
let colors=[];for(const avatar of avatars)avatar.userData.model.traverse(o=>{if(o.isSkinnedMesh)colors.push(o.geometry.attributes.color.array)});
assert.notDeepEqual(colors[0],colors[1],'team clothing colors remain distinct');
avatars.forEach(disposeAvatar);
console.log('Visual tests passed: merged geometry, skeleton, baked hand/weapon alignment, team colors and death animation');
