import * as T from './vendor/three.module.js';

export const solids = [], raySolids = [];
const mats = new Map();
const houses = [[-25,-22,10,8],[-9,-26,8,9],[10,-25,9,8],[26,-24,10,9],[-27,-5,8,7],[21,-2,10,8],[-26,15,9,8],[25,18,11,8],[-54,-45,12,10],[45,-45,10,9],[-50,47,10,8],[45,45,12,10]];
export function seeded(seed=18) { return () => { seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }; }
export function material(color) { if(!mats.has(color)) mats.set(color,new T.MeshStandardMaterial({color,roughness:.86})); return mats.get(color); }
export function box(parent,w,h,d,color,x=0,y=0,z=0) {
  const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material(color));
  mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
function cylinder(parent,rt,rb,h,color,x=0,y=0,z=0,n=12) {
  const mesh=new T.Mesh(new T.CylinderGeometry(rt,rb,h,n),material(color));
  mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
function capsule(parent,r,length,color,x=0,y=0,z=0) {
  const mesh=new T.Mesh(new T.CapsuleGeometry(r,length,4,8),material(color));
  mesh.position.set(x,y,z); mesh.castShadow=true; parent.add(mesh); return mesh;
}
function rawHeight(x,z) {
  const r=Math.hypot(x,z), coast=Math.max(0,Math.min(1,(124-r)/12));
  if(r>124) return -1.7;
  const hills=Math.max(0,Math.min(1,(r-44)/22));
  const h=(3.2+Math.sin(x*.065)*Math.cos(z*.08)*2.8+Math.sin((x+z)*.045)*1.8)*hills;
  return h*coast-(1-coast)*1.5;
}
export function groundHeight(x,z) {
  let h=rawHeight(x,z);
  for(const [cx,cz,w,d] of houses) {
    const margin=Math.max(Math.abs(x-cx)-w/2,Math.abs(z-cz)-d/2);
    if(margin<4) { const mix=Math.max(0,Math.min(1,margin/4)); h=rawHeight(cx,cz)*(1-mix)+h*mix; }
  }
  return h;
}

export function makeAvatar(color=0x1e6c91) {
  const avatar=new T.Group(), body=new T.Group(); avatar.add(body);
  const torso=cylinder(body,.24,.19,.63,color,0,1.42,0); torso.scale.set(1.25,1,.8);
  cylinder(body,.2,.2,.25,0x182d40,0,1.05,0);
  box(body,.47,.09,.32,0xceb66e,0,1.03,0);
  box(body,.31,.51,.13,0x152b38,0,1.44,-.2);
  for(const x of [-.12,.12]) box(body,.095,.18,.06,0x698996,x,1.24,-.29);
  box(body,.34,.44,.2,0x354655,0,1.45,.26);
  box(body,.12,.53,.035,0x5be1d0,0,1.46,.37);
  cylinder(body,.075,.085,.13,0xc39076,0,1.79,0);
  const head=new T.Mesh(new T.SphereGeometry(.18,14,10),material(0xc9a089));
  head.position.set(0,1.99,-.012); head.scale.set(.82,1.15,.88); head.userData.part='head'; body.add(head);
  const hair=new T.Mesh(new T.SphereGeometry(.18,12,8,0,Math.PI*2,0,Math.PI*.62),material(0xdce5ea));
  hair.position.set(0,2.055,.002); hair.userData.part='head'; body.add(hair);
  const visor=box(body,.26,.055,.05,0x142533,0,2.02,-.155); visor.userData.part='head';
  box(body,.11,.038,.057,0x65e6da,-.07,2.02,-.18).userData.part='head';
  const legs=[];
  for(const x of [-.13,.13]) {
    const hip=new T.Group(); hip.position.set(x,.95,0); body.add(hip);
    capsule(hip,.10,.30,0x22364a,0,-.22,0);
    box(hip,.16,.13,.08,color,0,-.35,-.09);
    const knee=new T.Group(); knee.position.y=-.44; hip.add(knee);
    capsule(knee,.08,.29,0x344c60,0,-.21,0);
    box(knee,.19,.13,.34,0x172431,0,-.44,-.06);
    box(knee,.19,.055,.35,0x70d8c3,0,-.49,-.065);
    legs.push({hip,knee});
  }
  const arms=[];
  for(const x of [-.31,.31]) {
    const arm=new T.Group(); arm.position.set(x,1.66,0); arm.rotation.x=1.0; body.add(arm);
    capsule(arm,.085,.20,color,0,-.16,0);
    const forearm=new T.Group(); forearm.position.y=-.31; forearm.rotation.x=.9; arm.add(forearm);
    capsule(forearm,.07,.19,0x182b39,0,-.15,0);
    capsule(forearm,.075,.04,0x172430,0,-.3,0);
    arms.push(arm);
  }
  const gun=new T.Group(); gun.position.set(.28,1.4,-.58); body.add(gun);
  avatar.userData={body,legs,arms,gun,baseGunZ:-.58};
  setAvatarWeapon(avatar,'ar');
  return avatar;
}
export function setAvatarWeapon(avatar,id) {
  const gun=avatar.userData.gun;
  for(const child of [...gun.children]){gun.remove(child);child.geometry.dispose()}
  if(id==='sg'){
    box(gun,.13,.15,.46,0x334656,0,0,.06);
    cylinder(gun,.055,.055,.71,0x6e7b81,-.045,.035,-.39).rotation.x=Math.PI/2;
    cylinder(gun,.055,.055,.71,0x6e7b81,.045,.035,-.39).rotation.x=Math.PI/2;
    box(gun,.15,.17,.32,0xa97948,0,-.015,.37);
    box(gun,.15,.11,.2,0xa97948,0,-.04,-.25);
  }else{
    const smg=id==='smg',length=smg?.35:.53;
    box(gun,.10,.16,length,0x172431,0,0,0);
    box(gun,.07,.08,smg?.23:.52,0x6f838b,0,.02,smg?-.23:-.39);
    box(gun,.095,.09,.21,0x0c1d26,0,.09,.03);
    box(gun,.13,.14,smg?.17:.29,0x246f85,0,0,smg?.25:.37);
    box(gun,.08,smg?.33:.22,.11,0x1c3441,0,-.2,-.03).rotation.x=-.2;
  }
  box(gun,.09,.17,.15,0x192c39,0,-.14,.15).rotation.x=-.3;
}
export function animateAvatar(avatar,speed,time,crouch=false) {
  const {body,legs,arms}=avatar.userData;
  const amplitude=Math.min(speed/6,1)*.58, phase=time*(speed>7?16:11);
  body.position.y=crouch?-.24:Math.abs(Math.sin(phase))*amplitude*.035;
  body.rotation.z=Math.sin(phase)*amplitude*.035;
  for(let i=0;i<legs.length;i++) {
    const wave=Math.sin(phase+i*Math.PI)*amplitude;
    legs[i].hip.rotation.x=crouch?.72+wave*.35:wave;
    legs[i].knee.rotation.x=crouch?-1.4:Math.min(0,-wave)*.6;
  }
  for(const arm of arms) arm.rotation.x=1+Math.sin(phase)*amplitude*.025;
}

function addCollider(mesh,x,z,w,d,height=4) {
  raySolids.push(mesh); solids.push({x,z,w:w/2,d:d/2,height});
}
function makeHouse(scene,x,z,w,d,index) {
  const h=groundHeight(x,z), g=new T.Group(); g.position.set(x,h,z); scene.add(g);
  const color=[0xd9d1bc,0xc2d4d0,0xd6bf9f,0xadbfc7][index%4];
  box(g,w,.10,d,0x827e70,0,.05,0).receiveShadow=true;
  for(const side of [-1,1]) {
    const wall=box(g,.28,3.6,d,color,side*w/2,1.8,0); addCollider(wall,x+side*w/2,z,.28,d);
    for(const front of [-1,1]) {
      const sectionWidth=(w-2.2)/2, sx=side*(w+2.2)/4;
      const wall2=box(g,sectionWidth,3.6,.28,color,sx,1.8,front*d/2);
      addCollider(wall2,x+sx,z+front*d/2,sectionWidth,.28);
      const frame=box(g,1.4,1.12,.1,0x486f81,sx,2.04,front*(d/2+.17));
      box(g,1.64,.1,.14,0xe4e1d1,sx,1.45,front*(d/2+.20));
      box(g,.08,1.18,.11,0xe4e1d1,sx,2.05,front*(d/2+.24));
    }
  }
  for(const front of [-1,1]) {
    const lintel=box(g,2.2,.55,.28,color,0,3.325,front*d/2); raySolids.push(lintel);
    box(g,2.5,.12,.55,0x5e625e,0,.05,front*(d/2+.22));
  }
  const roofColor=index%3===0?0xa76247:index%3===1?0x556779:0xb98663;
  for(const side of [-1,1]) {
    const roof=box(g,w*.56,.22,d+.9,roofColor,side*w*.255,4.15,0);
    roof.rotation.z=side*-.34; raySolids.push(roof);
    for(let r=0;r<5;r++) {
      const beam=box(g,.06,.045,d+.93,0x5a4e45,side*(w*.05+r*w*.10),4.96-r*w*.035-.18,0);
      beam.visible=false;
    }
  }
  const crate=box(g,1.2,1.05,1.2,0x947b55,-w*.30,.575,d*.26); addCollider(crate,x-w*.30,z+d*.26,1.2,1.2,1.05);
  box(g,1.4,.08,1.25,0x4f594a,-w*.30,1.12,d*.26);
  box(g,1.35,.05,1.35,0x515951,w*.22,.08,-d*.22);
}

export function makeWorld(scene) {
  const random=seeded(41);
  scene.background=new T.Color(0x8cc8e8); scene.fog=new T.Fog(0xc3dcea,125,390);
  scene.add(new T.HemisphereLight(0xdceeff,0x706b48,2.3));
  const sun=new T.DirectionalLight(0xffe6be,2.9); sun.position.set(-55,100,35); sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024); Object.assign(sun.shadow.camera,{left:-90,right:90,top:90,bottom:-90,near:1,far:220}); sun.shadow.bias=-.0007; scene.add(sun);
  const ocean=new T.Mesh(new T.PlaneGeometry(2000,2000),new T.MeshStandardMaterial({color:0x3c9bbc,roughness:.38,metalness:.15}));
  ocean.rotation.x=-Math.PI/2; ocean.position.y=-1; scene.add(ocean);
  const textureData=new Uint8Array(128*128*4);
  for(let i=0;i<128*128;i++) { const n=random()*35; textureData.set([96+n,109+n*.9,63+n*.65,255],i*4); }
  const grassTexture=new T.DataTexture(textureData,128,128); grassTexture.wrapS=grassTexture.wrapT=T.RepeatWrapping;
  grassTexture.repeat.set(35,35); grassTexture.colorSpace=T.SRGBColorSpace; grassTexture.needsUpdate=true;
  const terrainGeo=new T.PlaneGeometry(250,250,120,120),positions=terrainGeo.attributes.position, colors=[];
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i),z=-positions.getY(i),r=Math.hypot(x,z); positions.setXYZ(i,x,groundHeight(x,z),z);
    const tint=new T.Color(r>111?0xd8c89d:r>68?0xc1c6a3:0xd6dfbc); colors.push(tint.r,tint.g,tint.b);
  }
  terrainGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3)); terrainGeo.computeVertexNormals();
  const terrain=new T.Mesh(terrainGeo,new T.MeshStandardMaterial({map:grassTexture,vertexColors:true,roughness:1})); terrain.receiveShadow=true; scene.add(terrain);
  box(scene,6,.035,98,0xb4a790,0,.026,0).castShadow=false;
  box(scene,95,.04,4.8,0x9e9889,0,.03,-8).castShadow=false;
  for(const [i,site] of houses.entries()) makeHouse(scene,...site,i);
  const truck=new T.Group(); truck.position.set(-12,0,8); scene.add(truck);
  const cab=box(truck,2.2,1.7,2.1,0x476d79,0,1.5,-2.3); addCollider(cab,-12,5.7,2.2,2.1,2.4);
  const trailer=box(truck,2.3,2.1,4.5,0x76876f,0,1.55,1); addCollider(trailer,-12,9,2.3,4.5,2.6);
  for(const x of [-1.15,1.15]) for(const z of [-2.3,1.7]) { const wheel=cylinder(truck,.5,.5,.22,0x283136,x,.5,z); wheel.rotation.z=Math.PI/2; }
  for(let i=0;i<26;i++) {
    const x=(random()-.5)*155,z=(random()-.5)*155;
    if(Math.hypot(x,z)<14||solids.some(s=>Math.abs(x-s.x)<s.w+3&&Math.abs(z-s.z)<s.d+3)) continue;
    const w=1.7+random()*2,d=1.7+random(),h=groundHeight(x,z);
    const crate=box(scene,w,1.45,d,0x8b7651,x,h+.725,z); addCollider(crate,x,z,w,d,1.45);
    for(const side of [-1,1]) box(scene,w+.03,.11,d+.03,0x534e40,x,h+.7+side*.45,z);
  }
  const trunkGeo=new T.CylinderGeometry(.17,.31,5.7,8), leafGeo=new T.IcosahedronGeometry(1,1);
  const trunk=new T.InstancedMesh(trunkGeo,material(0x77694d),100), leaves=new T.InstancedMesh(leafGeo,material(0x3d7852),300);
  trunk.castShadow=true; leaves.castShadow=true; scene.add(trunk,leaves);
  const matrix=new T.Object3D(); let count=0;
  for(let i=0;i<100;i++) {
    const angle=random()*Math.PI*2,r=34+random()*73,x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    if(solids.some(s=>Math.abs(x-s.x)<s.w+3&&Math.abs(z-s.z)<s.d+3)) continue;
    const base=groundHeight(x,z),height=.8+random()*.55;
    matrix.position.set(x,base+2.85*height,z); matrix.scale.set(1,height,1); matrix.rotation.set(0,0,0); matrix.updateMatrix(); trunk.setMatrixAt(count,matrix.matrix);
    solids.push({x,z,w:.31,d:.31,height:8});
    for(let k=0;k<3;k++) { matrix.position.set(x+(k-1)*1.25,base+5.7*height+k*.55,z+(k%2)*.7); matrix.scale.set(2.5-k*.35,2.05,2.3); matrix.rotation.set(0,random()*6,0); matrix.updateMatrix(); leaves.setMatrixAt(count*3+k,matrix.matrix); }
    count++;
  }
  trunk.count=count; leaves.count=count*3; raySolids.push(trunk);
  const grassGeo=new T.ConeGeometry(.07,.48,3),grass=new T.InstancedMesh(grassGeo,material(0x7b934a),1100); let blades=0;
  for(let i=0;i<1100;i++) { const x=(random()-.5)*190,z=(random()-.5)*190; if(Math.hypot(x,z)>103||Math.abs(x)<5||Math.abs(z+8)<4||solids.some(s=>Math.abs(x-s.x)<s.w+1&&Math.abs(z-s.z)<s.d+1)) continue; matrix.position.set(x,groundHeight(x,z)+.2,z); matrix.scale.set(1,random()+.5,1); matrix.rotation.set(0,random()*6,random()*.2); matrix.updateMatrix(); grass.setMatrixAt(blades++,matrix.matrix); }
  grass.count=blades; scene.add(grass);
  for(let i=0;i<24;i++) { const a=i/24*Math.PI*2,r=103+random()*13,size=2+random()*3; const rock=new T.Mesh(new T.DodecahedronGeometry(size,1),material(0x8d9990)); rock.position.set(Math.cos(a)*r,groundHeight(Math.cos(a)*r,Math.sin(a)*r)+.4,Math.sin(a)*r); rock.scale.y=.65; rock.castShadow=true; scene.add(rock); addCollider(rock,rock.position.x,rock.position.z,size*.75,size*.75,size*.65); }
  const cloudMat=new T.MeshBasicMaterial({color:0xf1f6f8,fog:false});
  for(let i=0;i<9;i++) { const a=i/9*Math.PI*2; for(let k=0;k<3;k++) { const cloud=new T.Mesh(new T.SphereGeometry(15,10,6),cloudMat); cloud.scale.set(1.9,.35,.8); cloud.position.set(Math.cos(a)*230+k*13,70+random()*12,Math.sin(a)*230); scene.add(cloud); } }
  return {sun,ocean};
}
