import * as T from './vendor/three.module.js';
import {buildingParts,FLOOR_HEIGHT} from './architecture.mjs';
import {groundHeight} from './arena.mjs';
export function addBuilding(parent,b,{box,wallMat,roofMat,woodMat}){
 const root=new T.Group(),height=b.type==='warehouse'?5:(b.floors===2?FLOOR_HEIGHT:0)+3.7;
 root.position.set(b.x,groundHeight(b.x,b.z),b.z);parent.add(root);
 box(root,b.w,.14,b.d,woodMat,0,.04,0);
 for(const s of buildingParts(b)){
  if(s.type==='roof')continue;
  const x=s.x-b.x,z=s.z-b.z;
  if(s.type==='stairs'){
   const steps=14,depth=s.d*2/steps;
   for(let n=0;n<steps;n++){const h=(n+1)/steps*s.h;box(root,s.w*2,h,depth+.015,woodMat,x,h/2,z-s.d+(n+.5)*depth)}
   for(const side of[-1,1]){const rail=box(root,.055,.055,s.d*2/Math.cos(Math.atan2(s.h,s.d*2)),0x44585f,x+side*s.w,s.h/2+.9,z);rail.rotation.x=-Math.atan2(s.h,s.d*2);for(let n=0;n<=4;n++)box(root,.055,.9,.055,0x44585f,x+side*s.w,n/4*s.h+.45,z-s.d+n/4*s.d*2)}
  }else box(root,s.w*2,s.h,s.d*2,s.type==='wall'?wallMat:woodMat,x,s.y+s.h/2,z);
 }
 // Open windows have a frame and sill, without opaque painted glass panels.
 const win=Math.min(2.2,b.d*.3);
 for(let level=0;level<b.floors;level++)for(const side of[-1,1]){
  const x=side*(b.w/2+.025),base=level*FLOOR_HEIGHT;
  box(root,.45,.1,win+.2,woodMat,x,base+1.14,0);box(root,.4,.1,win+.2,woodMat,x,base+2.38,0);
  for(const sign of[-1,1])box(root,.4,1.24,.09,woodMat,x,base+1.76,sign*(win/2+.045));
 }
 const door=b.type==='warehouse'?3.2:2.2;
 for(const front of[-1,1]){box(root,door+.4,.12,.7,woodMat,0,.06,front*(b.d/2+.2));for(const side of[-1,1])box(root,.1,2.9,.4,woodMat,side*(door/2+.06),1.45,front*b.d/2)}
 if(b.type==='warehouse'){box(root,b.w+.8,.18,b.d+.8,roofMat,0,height+.09,0);for(let n=0;n<6;n++)box(root,.08,.12,b.d+.8,0x697b85,(n-2.5)*b.w/6,height+.2,0)}
 else{
  const angle=.3,rise=Math.tan(angle)*b.w/2;
  for(const side of[-1,1]){const roof=box(root,b.w/2/Math.cos(angle)+.6,.18,b.d+.9,roofMat,side*b.w/4,height+rise/2,0);roof.rotation.z=-side*angle}
  const shape=new T.Shape();shape.moveTo(-b.w/2,0);shape.lineTo(b.w/2,0);shape.lineTo(0,rise);shape.closePath();
  for(const front of[-1,1]){const face=new T.Mesh(new T.ShapeGeometry(shape),wallMat);face.position.set(0,height,front*b.d/2);if(front<0)face.rotation.y=Math.PI;root.add(face)}
  box(root,.12,.1,b.d+1,0x44585f,0,height+rise+.08,0);
 }
 // Tables, timber ceiling beams and rugs give rooms a readable interior.
 for(const x of[-b.w*.36,b.w*.36])box(root,.13,.13,b.d-.3,woodMat,x,height-.22,0);
 box(root,b.w*.4,.015,b.d*.35,0x536e73,0,.135,-b.d*.15);
 if(b.floors===2)box(root,2.8,.015,2.5,0x8d7260,-b.w*.15,FLOOR_HEIGHT+.015,-b.d*.2);
 return root;
}
export function addRoads(parent,roads,{box,road,groundHeight}){
 for(const r of roads){const length=Math.hypot(r.bx-r.ax,r.bz-r.az),steps=Math.ceil(length/5),parts=[];
  const dx=(r.bx-r.ax)/length,dz=(r.bz-r.az)/length,nx=-dz*r.width/2,nz=dx*r.width/2;
  for(let n=0;n<steps;n++){const a=n/steps,b=(n+1)/steps,points=[];for(const[t,side]of[[a,-1],[a,1],[b,-1],[b,1]]){const x=r.ax+(r.bx-r.ax)*t+nx*side,z=r.az+(r.bz-r.az)*t+nz*side;points.push(x,groundHeight(x,z)+.08,z)}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setAttribute('uv',new T.Float32BufferAttribute([0,n*.5,1,n*.5,0,(n+1)*.5,1,(n+1)*.5],2));geo.setIndex([0,2,1,1,2,3]);geo.computeVertexNormals();parts.push(geo)}
  for(const geo of parts)parent.add(new T.Mesh(geo,road));
  for(let n=1;n<steps;n+=3){const t=n/steps,x=r.ax+(r.bx-r.ax)*t,z=r.az+(r.bz-r.az)*t,mark=box(parent,.12,.025,1.8,0xd8ccaa,x,groundHeight(x,z)+.10,z);mark.rotation.y=Math.atan2(dx,dz)}
 }
}
