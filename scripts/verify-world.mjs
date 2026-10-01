import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {makeWorld,makeAvatar,setAvatarWeapon,groundHeight,solids,raySolids} from '../dist/world.mjs';
import {canStand,moveSlide} from '../dist/rules.mjs';

const scene=new T.Scene();makeWorld(scene);scene.updateMatrixWorld(true);
const doorway={x:-25,z:-17};
for(let i=0;i<25;i++)moveSlide(doorway,0,-.2,solids);
assert(Math.abs(doorway.z+22)<.01,'a player must be able to enter a house through its doorway');
assert(!canStand(-30,-22,solids),'house side walls must stop players');
const ray=new T.Raycaster(new T.Vector3(-35,1.6,-22),new T.Vector3(1,0,0),0,10);
assert(ray.intersectObjects(raySolids,false).length>0,'house walls must block bullets');
ray.set(new T.Vector3(-25,1.6,-17),new T.Vector3(0,0,-1));ray.far=4.9;
assert.equal(ray.intersectObjects(raySolids,false).length,0,'the open doorway must also admit bullets');
assert(raySolids.some(mesh=>mesh.isInstancedMesh),'tree trunks must be included in bullet cover');
for(let x=-100;x<100;x+=2)for(let z=-100;z<100;z+=2){
 assert(Number.isFinite(groundHeight(x,z)),'terrain height must stay finite');
 assert(Math.abs(groundHeight(x+.05,z)-groundHeight(x,z))<.3,'walking terrain must remain continuous');
}
const avatar=makeAvatar();scene.add(avatar);scene.updateMatrixWorld(true);
ray.set(new T.Vector3(0,2.03,-4),new T.Vector3(0,0,1));ray.far=5;
assert.equal(ray.intersectObject(avatar,true)[0]?.object.userData.part,'head','head-level bullets must register a headshot');
setAvatarWeapon(avatar,'smg');const short=new T.Box3().setFromObject(avatar.userData.gun).getSize(new T.Vector3()).z;
setAvatarWeapon(avatar,'ar');const long=new T.Box3().setFromObject(avatar.userData.gun).getSize(new T.Vector3()).z;
assert(long>short,'rifle and SMG must have distinct weapon geometry');
console.log('PASS: enterable houses, bullet cover, terrain continuity, head hits, and weapon models');
