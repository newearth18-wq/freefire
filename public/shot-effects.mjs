import * as T from './vendor/three.module.js';
export const RAINBOW=[0xff79ad,0xffb477,0xffe786,0x8ee8b4,0x81dcff,0xa7a1ff,0xdf9aff];
const LIFE=.32,HEARTS=5;
// Two bounded, reusable draw calls for every local, bot and online shot.
export class HeartShotEffects{
 constructor(scene,capacity=48){
  this.scene=scene;this.capacity=capacity;this.cursor=0;this.slots=Array.from({length:capacity},()=>({left:0,from:new T.Vector3(),to:new T.Vector3()}));
  const shape=new T.Shape();shape.moveTo(0,-.48);shape.bezierCurveTo(-.85,.04,-.55,.88,0,.35);shape.bezierCurveTo(.55,.88,.85,.04,0,-.48);
  const material=()=>new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,
   vertexShader:'attribute float fxAlpha;varying float vAlpha;varying vec3 vColor;void main(){vAlpha=fxAlpha;vColor=instanceColor;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
   fragmentShader:'varying float vAlpha;varying vec3 vColor;void main(){gl_FragColor=vec4(vColor,vAlpha);\n#include <colorspace_fragment>\n}'
  });
  this.ribbons=new T.InstancedMesh(new T.PlaneGeometry(1,1),material(),capacity*7);this.hearts=new T.InstancedMesh(new T.ShapeGeometry(shape,10),material(),capacity*HEARTS);
  this.dummy=new T.Object3D();this.side=new T.Vector3();this.direction=new T.Vector3();this.toward=new T.Vector3();this.normal=new T.Vector3();this.middle=new T.Vector3();this.point=new T.Vector3();this.basis=new T.Matrix4();
  for(const mesh of[this.ribbons,this.hearts]){mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.geometry.setAttribute('fxAlpha',new T.InstancedBufferAttribute(new Float32Array(mesh.count),1).setUsage(T.DynamicDrawUsage));for(let i=0;i<mesh.count;i++){mesh.setColorAt(i,new T.Color(RAINBOW[mesh===this.ribbons?i%7:(i%HEARTS*2)%7]));this.dummy.scale.setScalar(0);this.dummy.updateMatrix();mesh.setMatrixAt(i,this.dummy.matrix)}scene.add(mesh)}
 }
 emit(from,to,observer){if(![from.x,from.y,from.z,to.x,to.y,to.z].every(Number.isFinite))return false;if(observer&&Math.min(this.point.copy(from).distanceTo(observer),this.point.copy(to).distanceTo(observer))>120)return false;const slot=this.slots[this.cursor];this.cursor=(this.cursor+1)%this.capacity;slot.from.set(from.x,from.y,from.z);slot.to.set(to.x,to.y,to.z);slot.left=LIFE;return true}
 update(dt,camera){
  const ribbonAlpha=this.ribbons.geometry.attributes.fxAlpha,heartAlpha=this.hearts.geometry.attributes.fxAlpha;
  for(let slotIndex=0;slotIndex<this.capacity;slotIndex++){
   const slot=this.slots[slotIndex];slot.left=Math.max(0,slot.left-dt);const alpha=slot.left/LIFE,age=1-alpha;
   for(let n=0;n<7;n++)ribbonAlpha.setX(slotIndex*7+n,alpha*.62);for(let n=0;n<HEARTS;n++)heartAlpha.setX(slotIndex*HEARTS+n,alpha*.9);
   if(!slot.left)continue;
   this.direction.subVectors(slot.to,slot.from);const length=this.direction.length();this.direction.normalize();if(length<.001)this.direction.set(0,0,-1);
   this.middle.addVectors(slot.from,slot.to).multiplyScalar(.5);this.toward.subVectors(camera.position,this.middle).normalize();this.side.crossVectors(this.direction,this.toward);if(this.side.lengthSq()<.001)this.side.set(1,0,0).applyQuaternion(camera.quaternion);this.side.normalize();this.normal.crossVectors(this.direction,this.side).normalize();this.basis.makeBasis(this.direction,this.side,this.normal);
   this.dummy.quaternion.setFromRotationMatrix(this.basis);this.dummy.scale.set(Math.max(.001,length),.018,1);
   for(let n=0;n<7;n++){this.dummy.position.copy(this.middle).addScaledVector(this.side,(n-3)*.019);this.dummy.updateMatrix();this.ribbons.setMatrixAt(slotIndex*7+n,this.dummy.matrix)}
   this.dummy.quaternion.copy(camera.quaternion);
   for(let n=0;n<HEARTS;n++){if(n===0)this.point.copy(slot.from);else if(n===1)this.point.lerpVectors(slot.from,slot.to,Math.min(1,age*1.6));else this.point.copy(slot.to).addScaledVector(this.side,(n-3)*(.18+age*.4));this.point.y+=age*(n===0?.22:.65);this.dummy.position.copy(this.point);this.dummy.scale.setScalar((n===0?.20:.24)*(1+age*.5));this.dummy.updateMatrix();this.hearts.setMatrixAt(slotIndex*HEARTS+n,this.dummy.matrix)}
  }
  for(const mesh of[this.ribbons,this.hearts]){mesh.instanceMatrix.needsUpdate=true;mesh.geometry.attributes.fxAlpha.needsUpdate=true;mesh.visible=this.slots.some(slot=>slot.left>0)}
 }
 clear(){for(const slot of this.slots)slot.left=0;for(const mesh of[this.ribbons,this.hearts]){mesh.visible=false;mesh.geometry.attributes.fxAlpha.array.fill(0);mesh.geometry.attributes.fxAlpha.needsUpdate=true}}
 dispose(){for(const mesh of[this.ribbons,this.hearts]){this.scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();mesh.dispose()}}
}
