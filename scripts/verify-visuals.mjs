import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from '../public/vendor/three.module.js';
import {GLTFLoader} from '../public/vendor/addons/loaders/GLTFLoader.js';
import {prepareCharacter,makeAvatar,animateAvatar,setAvatarWeapon,disposeAvatar} from '../public/visuals.mjs';
import {WEAPONS} from '../public/rules.mjs';
const bytes=await readFile(new URL('../public/models/operative.glb',import.meta.url));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
prepareCharacter(gltf);
const avatars=[makeAvatar(0),makeAvatar(1)],point=new T.Vector3();
for(let i=0;i<WEAPONS.length;i++){setAvatarWeapon(avatars[0],i);setAvatarWeapon(avatars[1],i);const gun=avatars[0].userData.gun;assert.ok(gun.children.length>0&&gun.children.length<=5,'weapon parts remain batched');assert.equal(gun.children[0].geometry,avatars[1].userData.gun.children[0].geometry,'avatars share cached weapon geometry');assert.ok(new T.Box3().setFromObject(gun).getSize(new T.Vector3()).length()>0)}
avatars.forEach(a=>setAvatarWeapon(a,0));
const hidden=avatars[0],bone=hidden.userData.model.getObjectByName('WristR'),update=bone.updateMatrixWorld;
let visits=0;bone.updateMatrixWorld=function(force){visits++;return update.call(this,force)};
hidden.visible=false;hidden.updateMatrixWorld(true);assert.equal(visits,0,'hidden rigs skip skeleton traversal');
hidden.visible=true;hidden.position.x=3;hidden.updateMatrixWorld(true);assert.ok(visits>0,'visible rigs resume world transforms');
assert.equal(hidden.matrixWorld.elements[12],3);hidden.position.x=0;bone.updateMatrixWorld=update;
for(const avatar of avatars){let meshes=0;avatar.userData.model.traverse(o=>{if(o.isSkinnedMesh){meshes++;assert.ok(o.geometry.index.count/3>=10202&&o.geometry.index.count/3<10400,'original character and small rigged details stay within the geometry budget');assert.equal(o.skeleton.bones.length,62);assert.ok(o.geometry.attributes.color)}});assert.equal(meshes,1,'the full character uses one draw call');
 for(const speed of[0,5.4])for(let frame=0;frame<90;frame++){animateAvatar(avatar,{status:'alive',speed,crouch:false,pitch:0},1/60);avatar.updateMatrixWorld(true);avatar.userData.model.getObjectByName('WristR').getWorldPosition(point);assert.ok(point.distanceTo(avatar.userData.gun.position)<.4,'baked weapon anchor remains at the right hand');assert.ok(Number.isFinite(point.y)&&point.y>.5&&point.y<2.5,'animated skeleton has a valid standing pose')}
 animateAvatar(avatar,{status:'down',speed:0,crouch:false},.1);assert.equal(avatar.userData.gun.visible,false);
 for(let i=0;i<100;i++)animateAvatar(avatar,{status:'dead',speed:0,crouch:false},.05);
 assert.ok(avatar.userData.actions.Death.clampWhenFinished);
}
let colors=[];for(const avatar of avatars)avatar.userData.model.traverse(o=>{if(o.isSkinnedMesh)colors.push(o.geometry.attributes.color.array)});
assert.notDeepEqual(colors[0],colors[1],'team clothing colors remain distinct');
avatars.forEach(disposeAvatar);
console.log('Visual tests passed: merged geometry, skeleton, baked hand/weapon alignment, team colors and death animation');
