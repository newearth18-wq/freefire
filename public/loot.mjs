import * as T from './vendor/three.module.js';
import {batchStatic,box,material} from './visuals.mjs';
// Fixed geometry per item kind; collecting loot changes matrices, not geometry.
export function makeLootBatch(capacity=256){
 const root=new T.Group(),buckets=new Map(),matrix=new T.Matrix4();
 for(const[type,color]of Object.entries({ammo:0x5ac3dd,med:0x64edb5,armor:0x84a9ee,wall:0xb8eaff,weapon:0xffc755})){
  const template=new T.Group(),pad=new T.Mesh(new T.CylinderGeometry(.62,.62,.05,16),material(0x213d46));template.add(pad);
  if(type==='weapon'){box(template,.10,.16,1.2,0x20353d,0,.7,0);box(template,.1,.3,.18,color,0,.5,.2)}else{box(template,.55,.48,.55,type==='med'?0xd9e6dc:color,0,.58,0);if(type==='med'){box(template,.28,.08,.04,0x46c992,0,.58,-.3);box(template,.08,.29,.04,0x46c992,0,.58,-.31)}}
  const beam=new T.Mesh(new T.CylinderGeometry(.035,.20,2,6,1,true),new T.MeshBasicMaterial({color,transparent:true,opacity:.18,depthWrite:false}));beam.position.y=1;template.add(beam);batchStatic(template,false);
  const meshes=[];template.traverse(o=>{if(!o.isMesh)return;const mesh=new T.InstancedMesh(o.geometry,o.material,capacity);mesh.count=0;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.receiveShadow=true;if(o===beam||o.material.isMeshBasicMaterial)mesh.userData.disposableMaterial=true;root.add(mesh);meshes.push(mesh)});buckets.set(type,meshes);
 }
 root.userData.update=items=>{const grouped=new Map([...buckets.keys()].map(k=>[k,[]]));for(const item of items)grouped.get(item.type)?.push(item);for(const[type,meshes]of buckets){const list=grouped.get(type);if(list.length>capacity)throw Error('Loot capacity exceeded');for(const mesh of meshes){mesh.count=list.length;for(let i=0;i<list.length;i++){const l=list[i];matrix.makeTranslation(l.x,l.y,l.z);mesh.setMatrixAt(i,matrix)}mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()}}};
 return root;
}
