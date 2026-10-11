import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from '../public/vendor/three.module.js';
import {GLTFLoader} from '../public/vendor/addons/loaders/GLTFLoader.js';
import {buildCharacterDetails} from '../public/character-details.mjs';
import {CHARACTERS,characterDefault} from '../public/appearance.mjs';

const bytes=await readFile(new URL('../public/models/operative.glb',import.meta.url));
const model=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
let skeleton;model.scene.traverse(o=>{if(o.isSkinnedMesh&&!skeleton)skeleton=o.skeleton});
const names=skeleton.bones.map(b=>b.name),point=new T.Vector3();
let cases=0,maxTriangles=0;
for(const character of CHARACTERS)for(let upper=0;upper<3;upper++)for(let lower=0;lower<3;lower++)for(const backpack of[false,true])for(const distant of[false,true]){
 const parts=[],look={...characterDefault(character.id),upper,lower,backpack};
 buildCharacterDetails(look,(geometry,bone,color)=>{
  const index=names.indexOf(bone);assert.ok(index>=0,`attachment ${bone} exists on the operative skeleton`);
  assert.ok(Number.isInteger(color)&&color>=0&&color<=0xffffff);
  const p=geometry.attributes.position,n=geometry.attributes.normal;
  assert.ok(geometry.attributes.uv&&geometry.index,'pieces can merge with the textured, indexed skinned body');
  assert.ok(p.array.every(Number.isFinite)&&n.array.every(Number.isFinite));
  const transform=skeleton.boneInverses[index].clone().invert();
  for(let i=0;i<p.count;i++){
   point.fromBufferAttribute(p,i).applyMatrix4(transform);
   assert.ok(Math.abs(point.x)<1.5&&point.y>-.3&&point.y<2.7&&Math.abs(point.z)<.75,'accessories remain inside the actor silhouette bounds in bind pose');
   point.fromBufferAttribute(n,i);assert.ok(Math.abs(point.length()-1)<.002,'rounded textile normals are normalized');
  }
  if(bone.startsWith('LowerLeg')){
   geometry.computeBoundingBox();const center=geometry.boundingBox.getCenter(new T.Vector3()).applyMatrix4(transform);
   assert.ok(center.z>.17,'knee details face forward despite the reversed lower-leg bind axis');
  }
  parts.push(geometry);
 },distant);
 const triangles=parts.reduce((sum,g)=>sum+g.index.count/3,0);maxTriangles=Math.max(maxTriangles,triangles);
 assert.ok(triangles<1400,'near apparel preserves the mobile triangle budget');
 if(distant)assert.equal(triangles,backpack?48:0,'distant apparel only retains the structured backpack silhouette');
 if(!backpack)assert.ok(parts.every(g=>{g.computeBoundingBox();return g.boundingBox.max.z>-.12}),'disabling backpacks removes every bag piece');
 parts.forEach(g=>g.dispose());cases++;
}
console.log(`Character details passed: ${cases} apparel/backpack/detail cases, real bind axes, merge attributes and ${maxTriangles} maximum added triangles`);
