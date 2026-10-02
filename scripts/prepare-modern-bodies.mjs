// Offline CC0 body retargeting. No conversion or IK runs in the game loop.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import * as T from '../public/vendor/three.module.js';
import {GLTFLoader} from '../public/vendor/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from '../public/vendor/addons/exporters/GLTFExporter.js';
import {mergeVertices} from '../public/vendor/addons/utils/BufferGeometryUtils.js';
globalThis.ProgressEvent=class{constructor(type,o){Object.assign(this,o)}};
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.()})}readAsDataURL(b){b.arrayBuffer().then(v=>{this.result='data:'+b.type+';base64,'+Buffer.from(v).toString('base64');this.onloadend?.()})}};
const dir=resolve(process.argv[2]??'../modern-character-assets'),backup=resolve(process.argv[3]??'../modern-character-assets/faces-v9'),loader=new GLTFLoader();
await mkdir(backup,{recursive:true});
async function donor(sex){const d=JSON.parse(await readFile(dir+'/Superhero_'+sex+'_FullBody.gltf'));d.buffers[0].uri='data:application/octet-stream;base64,'+(await readFile(dir+'/Superhero_'+sex+'_FullBody.bin')).toString('base64');delete d.images;delete d.textures;for(const m of d.materials){delete m.pbrMetallicRoughness.baseColorTexture;delete m.pbrMetallicRoughness.metallicRoughnessTexture;delete m.normalTexture;delete m.occlusionTexture}const g=await loader.parseAsync(JSON.stringify(d),'');g.scene.updateMatrixWorld(true);let mesh;g.scene.traverse(o=>{if(o.isSkinnedMesh&&/superhero/i.test(o.name))mesh=o});return mesh}
function mapped(name){const fixed={root:'Root',pelvis:'Hips',spine_01:'Abdomen',spine_02:'Torso',spine_03:'Chest',neck_01:'Neck',Head:'Head'};if(fixed[name])return fixed[name];const side=name.endsWith('_l')?'L':'R';for(const[a,b]of[['clavicle','Shoulder'],['upperarm','UpperArm'],['lowerarm','LowerArm'],['hand','Wrist'],['thigh','UpperLeg'],['calf','LowerLeg'],['foot','Foot'],['ball','Foot']])if(name.startsWith(a+'_'))return b+side;const finger=name.match(/^(index|middle|ring|pinky|thumb)_0([1-4])/);return finger?finger[1][0].toUpperCase()+finger[1].slice(1)+Math.min(finger[1]==='thumb'?3:4,Number(finger[2])+1)+side:'Root'}
const sources={Male:await donor('Male'),Female:await donor('Female')},metadata=[];
for(const[key,sex]of[['operative','Male'],['nova','Female'],['ghost','Male']]){
 let bytes;try{bytes=await readFile(backup+'/'+key+'.glb')}catch{bytes=await readFile('public/models/'+key+'.glb');await writeFile(backup+'/'+key+'.glb',bytes)}
 const g=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');g.scene.updateMatrixWorld(true);let first;const remove=[];g.scene.traverse(o=>{if(!o.isSkinnedMesh)return;first??=o;let p=o;while(p&&!/_(Body|Legs)$/.test(p.name))p=p.parent;if(p)remove.push(o)});
 const rig=first.skeleton,bindWorld=rig.bones.map(b=>b.matrixWorld.clone()),bindInv=rig.boneInverses.map(m=>m.clone().multiply(first.matrixWorld.clone().invert())),names=rig.bones.map(b=>b.name),mixer=new T.AnimationMixer(g.scene);mixer.clipAction(g.animations.find(c=>c.name.endsWith('Idle_Neutral'))).play();mixer.setTime(.01);g.scene.updateMatrixWorld(true);
 const neutral=rig.bones.map(b=>b.matrixWorld.clone()),skinMatrices=neutral.map((m,i)=>m.clone().multiply(bindInv[i])),src=sources[sex],srcRig=src.skeleton,spos=srcRig.bones.map(b=>b.getWorldPosition(new T.Vector3())),tpos=rig.bones.map(b=>b.getWorldPosition(new T.Vector3())),map=srcRig.bones.map(b=>{const index=names.indexOf(mapped(b.name));if(index<0)throw Error('Unmapped joint: '+b.name);return index});
 const transforms=srcRig.bones.map((b,i)=>{let child=b.children.find(c=>c.isBone&&srcRig.bones.includes(c)&&map[srcRig.bones.indexOf(c)]!==map[i]);const targetIndex=map[i],origin=spos[i],end=child?spos[srcRig.bones.indexOf(child)]:null,targetEnd=child?tpos[map[srcRig.bones.indexOf(child)]]:null;
  let q=new T.Quaternion(),s=.90;if(end&&targetEnd){const a=end.clone().sub(origin),z=targetEnd.clone().sub(tpos[targetIndex]);if(a.length()>.005&&z.length()>.005){s=T.MathUtils.clamp(z.length()/a.length(),.55,1.15);q.setFromUnitVectors(a.normalize(),z.normalize())}}
  // Feet share the old shoe slot; keep their forward direction and avoid toe-roll.
  if(/foot|ball/.test(b.name)){q.identity();s=.9}
  return new T.Matrix4().makeTranslation(...tpos[targetIndex].toArray()).multiply(new T.Matrix4().compose(new T.Vector3(),q,new T.Vector3(s,s,s))).multiply(new T.Matrix4().makeTranslation(-origin.x,-origin.y,-origin.z))});
 const geo=src.geometry,pos=geo.attributes.position,si=geo.attributes.skinIndex,sw=geo.attributes.skinWeight,tri=geo.index.array,converted=[],weights=[],ids=[],zones=[],surface=[],point=new T.Vector3(),sum=new T.Vector3(),blend=new T.Matrix4();
 for(let i=0;i<pos.count;i++){src.getVertexPosition(i,point).applyMatrix4(src.matrixWorld);let head=0,arm=0,hand=0;for(let n=0;n<4;n++){const name=srcRig.bones[si.getComponent(i,n)].name,w=sw.getComponent(i,n);if(name==='Head')head+=w;if(/lowerarm/.test(name))arm+=w;if(/hand|index|middle|thumb|pinky|ring/.test(name))hand+=w}const y=point.y;surface.push(point.toArray());zones.push(head>.25||y>1.57?'discard':y<.13?'discard':y<1.01&&Math.abs(point.x)<.27?'legs':hand>.35||key==='nova'&&arm>.5||y>1.48&&Math.abs(point.x)<.11?'skin':'body');
  sum.set(0,0,0);const ws=[],is=[];for(let n=0;n<4;n++){const sourceIndex=si.getComponent(i,n),w=sw.getComponent(i,n);sum.addScaledVector(point.clone().applyMatrix4(transforms[sourceIndex]),w);is.push(map[sourceIndex]);ws.push(w)}
  // Expand the clothing shell in source space before retargeting. Skin remains fitted.
  if(zones[i]==='body'||zones[i]==='legs'){const normal=new T.Vector3().fromBufferAttribute(geo.attributes.normal,i).transformDirection(src.matrixWorld),amount=zones[i]==='legs'?.014:key==='ghost'?.021:.012;const offset=normal.multiplyScalar(amount);sum.set(0,0,0);for(let n=0;n<4;n++)sum.addScaledVector(point.clone().add(offset).applyMatrix4(transforms[si.getComponent(i,n)]),ws[n])}
  blend.elements.fill(0);for(let n=0;n<4;n++)for(let k=0;k<16;k++)blend.elements[k]+=skinMatrices[is[n]].elements[k]*ws[n];sum.applyMatrix4(blend.invert());converted.push(sum.toArray());ids.push(is);weights.push(ws);
 }
 const buckets=new Map();for(let n=0;n<tri.length;n+=3){const verts=[tri[n],tri[n+1],tri[n+2]],zone=zones[verts[0]];if(verts.some(i=>zones[i]==='discard'))continue;const slot=zone==='legs'?'legs':'body',mat=zone==='skin'?'Skin':'Fabric';const name=slot+':'+mat;if(!buckets.has(name))buckets.set(name,{slot,mat,p:[],si:[],sw:[],colors:[]});const b=buckets.get(name);for(const i of verts){b.p.push(...converted[i]);b.si.push(...ids[i]);b.sw.push(...weights[i]);const[x,y,z]=surface[i],inner=zone==='body'&&z>.045&&y>1.015&&y<1.46?1-T.MathUtils.smoothstep(Math.abs(x),.045,.084):0,value=1-inner*.96;b.colors.push(value,value,value)}}
 mixer.stopAllAction();mixer.setTime(0);for(let i=0;i<rig.bones.length;i++){const b=rig.bones[i],local=b.parent?b.parent.matrixWorld.clone().invert().multiply(bindWorld[i]):bindWorld[i];local.decompose(b.position,b.quaternion,b.scale);b.updateMatrix();g.scene.updateMatrixWorld(true)}
 // Geometry and inverse bind matrices are both in metres, as in the head conversion.
 const skinRig=new T.Skeleton(rig.bones,bindInv);for(const mesh of remove)mesh.parent.remove(mesh);
 for(const b of buckets.values()){
  const raw=new T.BufferGeometry();raw.setAttribute('position',new T.Float32BufferAttribute(b.p,3));raw.setAttribute('skinIndex',new T.Uint16BufferAttribute(b.si,4));raw.setAttribute('skinWeight',new T.Float32BufferAttribute(b.sw,4));
  if(b.mat==='Fabric')raw.setAttribute('color',new T.Float32BufferAttribute(b.colors,3));
  const geometry=mergeVertices(raw,1e-5);raw.dispose();geometry.computeVertexNormals();
  const mat=new T.MeshStandardMaterial({color:b.mat==='Skin'?0xc48961:0xffffff,roughness:.76,vertexColors:b.mat==='Fabric'});mat.name=b.mat;
  const mesh=new T.SkinnedMesh(geometry,mat);mesh.name='Modern_'+b.slot;mesh.bind(skinRig,new T.Matrix4());
  const groupName='Refined_'+(b.slot==='legs'?'Legs':'Body');let group=g.scene.getObjectByName(groupName);
  if(!group){group=new T.Group();group.name=groupName;g.scene.add(group)}group.add(mesh);
 }
 const output=await new GLTFExporter().parseAsync(g.scene,{binary:true,animations:g.animations.filter(c=>['Idle_Neutral','Idle_Gun_Pointing','Run','Run_Shoot','Death'].some(name=>c.name.endsWith(name))),onlyVisible:false});await writeFile('public/models/'+key+'.glb',Buffer.from(output));metadata.push({model:key,source:sex,bodyTriangles:[...buckets.values()].reduce((n,b)=>n+b.p.length/9,0),bytes:output.byteLength});
}
await writeFile('public/models/MODERN-BODIES.json',JSON.stringify(metadata,null,2));console.log(metadata);
