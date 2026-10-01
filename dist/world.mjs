import * as T from './vendor/three.module.js';
export const solids=[], raySolids=[];
const mats=new Map();
export function material(color){if(!mats.has(color))mats.set(color,new T.MeshStandardMaterial({color,roughness:.85}));return mats.get(color)}
export function box(parent,w,h,d,color,x=0,y=0,z=0){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function cylinder(parent,r1,r2,h,color,x,y,z,n=7){const m=new T.Mesh(new T.CylinderGeometry(r1,r2,h,n),material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
export function seeded(seed=18){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
export function makeAvatar(color=0xe9a35a){const g=new T.Group();box(g,.63,.82,.4,color,0,1.28,0);box(g,.52,.47,.46,0x283c42,0,1.82,0);box(g,.5,.16,.49,0x637373,0,2.07,0);box(g,.38,.12,.025,0x98cfcb,0,1.88,-.24);box(g,.56,.28,.42,0x26353b,0,.84,0);box(g,.4,.56,.22,0x4d6967,0,1.28,.3);const l=box(g,.22,.66,.24,0x263c40,-.18,.46,0),r=box(g,.22,.66,.24,0x263c40,.18,.46,0);box(g,.23,.17,.38,0x14262b,-.18,.12,-.04);box(g,.23,.17,.38,0x14262b,.18,.12,-.04);box(g,.17,.62,.22,color,-.41,1.32,-.13).rotation.x=-.4;box(g,.17,.58,.22,color,.4,1.33,-.18).rotation.x=-.7;const gun=box(g,.12,.15,.84,0x172a30,.37,1.25,-.58);box(g,.045,.055,.42,0x688a86,.37,1.27,-1.12);g.userData={l,r,gun};return g}
export function animateAvatar(avatar,speed,time){const a=avatar.userData;const wave=Math.sin(time*12)*Math.min(speed/5,1)*.55;a.l.rotation.x=wave;a.r.rotation.x=-wave}
export function makeWorld(scene){const rand=seeded();
scene.background=new T.Color(0x83acae);scene.fog=new T.Fog(0x83acae,95,290);
scene.add(new T.HemisphereLight(0xe5f6ee,0x465b41,2.1));
const sun=new T.DirectionalLight(0xffe1b2,2.7);sun.position.set(-35,80,-55);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-85,right:85,top:85,bottom:-85,near:1,far:190});sun.shadow.bias=-.001;scene.add(sun);
const ocean=new T.Mesh(new T.PlaneGeometry(2000,2000),material(0x3e9598));ocean.rotation.x=-Math.PI/2;ocean.position.y=-.9;scene.add(ocean);
cylinder(scene,126,131,.7,0xc8bb88,0,-.7,0,64);cylinder(scene,112,120,.65,0x6c8260,0,-.38,0,64);
const path=box(scene,5,.04,190,0x9a9872,0,-.025,0);path.castShadow=false;box(scene,155,.04,4,0x9a9872,0,-.02,-8).castShadow=false;
const sites=[[-25,-22,10,8],[-9,-26,8,9],[10,-25,9,8],[26,-24,10,9],[-27,-5,8,7],[21,-2,10,8],[-26,15,9,8],[25,18,11,8],[-54,-45,12,10],[45,-45,10,9],[-50,47,10,8],[45,45,12,10]];
for(let i=0;i<sites.length;i++){const[x,z,w,d]=sites[i];const group=new T.Group();group.position.set(x,0,z);scene.add(group);const color=[0xadb4a1,0x9bafa7,0xc0b197,0x819e9b][i%4];const wall=box(group,w,5,d,color,0,2.5,0);raySolids.push(wall);box(group,w+.55,.35,d+.55,0x3a5e5c,0,5.1,0);box(group,w+.3,.23,d+.3,0x688985,0,5.4,0);box(group,1.7,2.8,.08,0x253c3e,0,1.4,-d/2-.06);for(const side of[-1,1]){box(group,1.45,1.2,.08,0x4b777b,side*(w*.31),3,-d/2-.06);box(group,1.7,.12,.2,0xe0d6b0,side*(w*.31),2.35,-d/2-.1)}solids.push({x,z,w:w/2,d:d/2});}
for(let i=0;i<24;i++){const x=(rand()-.5)*145,z=(rand()-.5)*145;if(Math.hypot(x,z)<12||solids.some(s=>Math.abs(x-s.x)<s.w+4&&Math.abs(z-s.z)<s.d+4))continue;const w=2+rand()*2,d=2+rand();const c=box(scene,w,1.6,d,0x826f4b,x,.8,z);raySolids.push(c);box(scene,w+.06,.12,d+.06,0xb09b68,x,1.65,z);solids.push({x,z,w:w/2,d:d/2});}
for(let i=0;i<62;i++){const angle=rand()*Math.PI*2,r=40+rand()*67,x=Math.cos(angle)*r,z=Math.sin(angle)*r;if(solids.some(s=>Math.abs(x-s.x)<s.w+4&&Math.abs(z-s.z)<s.d+4))continue;const h=5+rand()*4;cylinder(scene,.2,.4,h,0x736c45,x,h/2,z);const top=new T.Mesh(new T.ConeGeometry(3,4,5),material(i%3?0x3d6e52:0x487d5a));top.position.set(x,h,z);scene.add(top);top.castShadow=true;solids.push({x,z,w:.5,d:.5});}
for(let i=0;i<32;i++){const a=i/32*Math.PI*2,r=110+rand()*9;const rock=new T.Mesh(new T.DodecahedronGeometry(2+rand()*4,0),material(0x7d9387));rock.position.set(Math.cos(a)*r,.5,Math.sin(a)*r);rock.scale.y=.7;scene.add(rock)}
for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const mountain=new T.Mesh(new T.ConeGeometry(30+rand()*20,25+rand()*35,5),material(0x6b9090));mountain.position.set(Math.cos(a)*310,3,Math.sin(a)*310);scene.add(mountain)}
return {sun,ocean};
}

