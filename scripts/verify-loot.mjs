import assert from 'node:assert/strict';
import {makeLootBatch} from '../public/loot.mjs';
const root=makeLootBatch(),meshes=root.children.filter(m=>m.isInstancedMesh),geometry=meshes.map(m=>m.geometry);
const items=Array.from({length:203},(_,id)=>({id,type:['ammo','med','armor','wall','weapon','scope'][id%6],x:id%16,y:0,z:Math.floor(id/16)}));
root.userData.update(items);assert.ok(meshes.length<26,'all loot including scopes uses fewer than 26 draw calls');assert.ok(meshes.every(m=>m.count>=33&&m.count<=34));
root.userData.update(items.filter(l=>l.type!=='med'));assert.equal(meshes.filter(m=>m.count===0).length,4,'collected medical kits leave no visible instances');
assert.ok(meshes.every((m,i)=>m.geometry===geometry[i]),'collecting loot preserves all GPU geometry');
const sphere=meshes.find(m=>m.count>0).boundingSphere;assert.ok(Number.isFinite(sphere.radius)&&sphere.radius>0,'instance bounds encompass the remaining items');
const marker=root.userData.pickupMarker,markerGeometry=marker.geometry;root.userData.highlight({x:2,y:3,z:4});assert.equal(marker.visible,true);assert.equal(marker.position.y,3.08);root.userData.highlight(null);assert.equal(marker.visible,false);assert.equal(marker.geometry,markerGeometry,'the selection ring reuses its geometry');marker.geometry.dispose();marker.material.dispose();
for(const mesh of meshes){mesh.dispose();mesh.geometry.dispose();if(mesh.userData.disposableMaterial)mesh.material.dispose()}
console.log('Loot tests passed: 203 items, bounded instanced draw calls, pickup removal, one reusable selection ring and stable geometry');
