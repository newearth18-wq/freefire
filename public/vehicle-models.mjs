import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
function roundedBox(w,h,d){const g=new T.BoxGeometry(w,h,d,2,2,2),p=g.attributes.position,half=new T.Vector3(w/2,h/2,d/2),r=Math.min(.075,w/4,h/4,d/4),inner=half.clone().addScalar(-r),low=inner.clone().negate(),point=new T.Vector3(),anchor=new T.Vector3();for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i);anchor.copy(point).clamp(low,inner);point.sub(anchor).normalize().multiplyScalar(r).add(anchor);p.setXYZ(i,point.x,point.y,point.z)}g.computeVertexNormals();return g}
const models=new Map();
function makeModel(color){
 const geometries=[],add=(geometry,tint,x=0,y=0,z=0)=>{geometry.translate(x,y,z);const c=new T.Color(tint),n=geometry.attributes.position.count,values=new Float32Array(n*3);for(let i=0;i<n;i++)values.set([c.r,c.g,c.b],i*3);geometry.setAttribute('color',new T.Float32BufferAttribute(values,3));geometries.push(geometry)};
 const body=(w,h,d,c,x,y,z)=>add(roundedBox(w,h,d),c,x,y,z),dark=0x243941,paint=[0x398a95,0xb5636f,0x587baf][color%3];
 body(1.9,.35,3.5,paint,0,.73,0);body(1.8,.42,1.05,paint,0,1.05,-1.1);body(1.85,.6,.65,paint,0,1.04,1.35);
 body(1.65,.22,1.5,dark,0,.96,.25);body(.42,.45,1.2,dark,-.84,1.05,.1);body(.42,.45,1.2,dark,.84,1.05,.1);
 body(1.55,.18,.2,dark,0,1.38,-.63);const steering=new T.TorusGeometry(.19,.022,6,16);steering.rotateX(-.65);add(steering,0x879a99,-.48,1.55,-.62);
 for(const x of[-.48,.48]){body(.48,.12,.56,0x5e6a67,x,1.02,-.15);body(.48,.55,.13,0x5e6a67,x,1.27,.17)}
 body(1.1,.16,.5,0x5e6a67,0,1.08,.88);body(1.1,.5,.14,0x5e6a67,0,1.32,1.1);
 for(const x of[-.85,.85])for(const z of[-.7,1.0]){const tube=new T.CylinderGeometry(.04,.04,1.1,8);add(tube,dark,x,1.75,z)}
 body(1.9,.12,1.9,paint,0,2.27,.15);body(1.84,.1,.12,dark,0,2.2,-.78);
 body(2.04,.18,.22,dark,0,.66,-1.82);body(2.04,.18,.22,dark,0,.66,1.82);body(1.1,.2,.025,dark,0,1.0,-1.638);
 for(const x of[-.67,.67])body(.29,.16,.04,0xf8eecb,x,1.12,-1.638);
 const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());const shell=new T.Mesh(merged,new T.MeshStandardMaterial({vertexColors:true,roughness:.62,metalness:.22}));shell.name='RoverBody';
 const wheelGeometry=new T.CylinderGeometry(.48,.48,.31,14);wheelGeometry.rotateZ(Math.PI/2);const wheelMaterial=new T.MeshStandardMaterial({color:0x1b292c,roughness:.95});const wheels=[];
 for(const x of[-.99,.99])for(const z of[-1.12,1.12]){const wheel=new T.Mesh(wheelGeometry,wheelMaterial);wheel.position.set(x,.48,z);wheel.name='Wheel';wheels.push(wheel)}
 const root=new T.Group();root.add(shell,...wheels);return root;
}
export function makeVehicle(v){if(!models.has(v.color??0))models.set(v.color??0,makeModel(v.color??0));const root=models.get(v.color??0).clone();root.name='IslandRover';root.userData.wheels=root.children.filter(c=>c.name==='Wheel');root.userData.roll=0;root.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true}});updateVehicle(root,v,0);return root}
export function updateVehicle(root,v,dt){root.position.set(v.x,v.y+.05,v.z);root.rotation.y=v.yaw;root.userData.roll+=(v.speed??0)*dt/.48;for(let i=0;i<root.userData.wheels.length;i++){const wheel=root.userData.wheels[i];wheel.rotation.x=root.userData.roll;wheel.rotation.y=i%2===0?(v.steer??0)*.32:0}}
