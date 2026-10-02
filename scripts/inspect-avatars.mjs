import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import * as T from '../public/vendor/three.module.js';
import {GLTFLoader} from '../public/vendor/addons/loaders/GLTFLoader.js';
import {prepareCharacter,makeAvatar,animateAvatar,disposeAvatar} from '../public/visuals.mjs';
import {CHARACTERS,characterDefault} from '../public/appearance.mjs';
for(const c of CHARACTERS){const b=await readFile('public/models/'+c.model+'.glb');prepareCharacter(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),''),c.model)}
const output=[];
for(const c of CHARACTERS){const root=makeAvatar(0,characterDefault(c.id));animateAvatar(root,{status:'alive',preview:true,speed:0},.1);root.updateMatrixWorld(true);const triangles=[];root.userData.model.traverse(o=>{if(!o.isSkinnedMesh)return;const bounds=new T.Box3(),point=new T.Vector3(),geo=o.geometry;for(let i=0;i<geo.attributes.position.count;i++){o.getVertexPosition(i,point).applyMatrix4(o.matrixWorld);bounds.expandByPoint(point)}console.log(c.id,bounds.min.toArray(),bounds.max.toArray(),geo.index.count/3);for(let n=0;n<geo.index.count;n+=3){const tri=[];for(let k=0;k<3;k++){const i=geo.index.array[n+k];o.getVertexPosition(i,point).applyMatrix4(o.matrixWorld);tri.push(...point.toArray())}for(let k=0;k<3;k++){const i=geo.index.array[n+k];tri.push(geo.attributes.color.getX(i),geo.attributes.color.getY(i),geo.attributes.color.getZ(i))}triangles.push(tri)}});output.push({id:c.id,triangles});disposeAvatar(root)}
const file=process.argv[2]??'../modern-character-assets/avatar-geometry.json';await mkdir(dirname(file),{recursive:true});await writeFile(file,JSON.stringify(output));
