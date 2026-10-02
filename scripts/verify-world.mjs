import assert from 'node:assert/strict';
import * as T from '../public/vendor/three.module.js';
import {makeWorld} from '../public/visuals.mjs';
import {MAPS} from '../public/maps.mjs';
import {groundHeight} from '../public/arena.mjs';
import {makeMatch,tick} from '../public/engine.mjs';
const textures=Array.from({length:3},()=>new T.Texture());
for(const map of MAPS){const scene=new T.Scene(),world=makeWorld(scene,map.id,textures),terrain=scene.getObjectByName('IslandTerrain'),p=terrain.geometry.attributes.position;terrain.geometry.computeBoundingBox();assert.equal(terrain.geometry.boundingBox.max.x-terrain.geometry.boundingBox.min.x,map.radius*2+12);
 for(let i=0;i<p.count;i+=151){assert.ok(Math.abs(p.getY(i)-groundHeight(p.getX(i),p.getZ(i)))<.001,'visual terrain height matches collision terrain')}
 let meshes=0;scene.traverse(o=>{if(o.isMesh)meshes++});assert.ok(meshes<50,'world geometry stays batched on larger maps');const grass=scene.children.find(o=>o.isInstancedMesh&&o.geometry.type==='ConeGeometry');assert.ok(grass);world.setDetail('low');assert.equal(grass.visible,false,'low quality hides decorative grass');world.setDetail('full');assert.equal(grass.visible,true);world.dispose();assert.equal(scene.children.length,0,'switching maps releases every world root');
 const match=makeMatch({mapId:map.id});match.drop=0;const start=performance.now();for(let i=0;i<120;i++)tick(match,1/30);console.log(map.name+': '+meshes+' meshes, 50 actors simulated at '+((performance.now()-start)/120).toFixed(2)+' ms/tick locally');
}
console.log('World passed: enlarged visual terrain matches physics, batched geometry, cleanup and all-map simulations (CPU measurements, not FPS)');
