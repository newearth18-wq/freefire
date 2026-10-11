import * as T from './vendor/three.module.js';
import {normalizeAppearance,SWATCHES} from './appearance.mjs';

// These pieces are baked into the cached skinned body. Their positions are in
// each bone's bind-local space, so seams follow movement without extra meshes.
function roundedPanel(w,h,d,r=.012){
 // Stitching, zippers and small flat buckles do not need rounded tessellation.
 if(Math.min(w,h,d)<.016)return new T.BoxGeometry(w,h,d);
 const geometry=new T.BoxGeometry(w,h,d,2,2,2),p=geometry.attributes.position,n=geometry.attributes.normal;
 const half=new T.Vector3(w/2,h/2,d/2),radius=Math.min(r,half.x,half.y,half.z),inner=half.clone().addScalar(-radius),point=new T.Vector3(),anchor=new T.Vector3(),normal=new T.Vector3();
 for(let i=0;i<p.count;i++){
  point.fromBufferAttribute(p,i);anchor.copy(point).clamp(inner.clone().negate(),inner);normal.subVectors(point,anchor).normalize();point.copy(anchor).addScaledVector(normal,radius);p.setXYZ(i,point.x,point.y,point.z);n.setXYZ(i,normal.x,normal.y,normal.z);
 }
 return geometry;
}
function tint(hex,scale){return new T.Color(hex).multiplyScalar(scale).getHex()}

export function buildCharacterDetails(appearance,rigged,distant=false){
 const a=normalizeAppearance(appearance),dark=0x17242c,trim=a.cosmetic==='heart'?0xffbddc:a.cosmetic==='aurora'?0x89eedd:a.upper===2?0x72d4db:0xd9bf80;
 const cloth=a.cosmetic==='scholar'?0x465d72:a.cosmetic==='aurora'?0x4e628c:a.cosmetic==='heart'?0x865075:SWATCHES[a.upperColor].hex;
 const panel=(bone,w,h,d,x,y,z,color,r=.012)=>rigged(roundedPanel(w,h,d,r).translate(x,y,z),bone,color);
 const pipe=(bone,points,radius,color,segments=8)=>rigged(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,radius,5,false),bone,color);

 if(!distant){
  // Jacket fronts keep the selected textile visible. Patrol apparel has a
  // compact vest; the street outfit retains its lighter, open silhouette.
  if(a.upper!==1){
   panel('Chest',.278,.235,.035,0,-.023,.126,tint(cloth,a.upper===2?.76:.93),.017);
   for(const sign of[-1,1]){
    panel('Chest',.088,.072,.018,sign*.077,-.070,.156,tint(cloth,.61),.009);
    panel('Chest',.084,.008,.022,sign*.077,-.036,.163,trim,.004);
   }
  }
  for(const sign of[-1,1]){
   // Chest-local axes are upright; lower-leg Z points backwards in this rig.
   pipe('Chest',[[sign*.113,-.126,.126],[sign*.115,.018,.135],[sign*.111,.111,.106]],.009,dark,5);
   if(a.lower!==1){
    const leg=sign<0?'LowerLegL':'LowerLegR';
    panel(leg,.099,.117,.033,0,.035,-.098,dark,.014);
    panel(leg,.079,.013,.036,0,.000,-.102,trim,.006);
   }
   // A small rounded hand-back pad follows the wrist rather than the forearm.
   const wrist=sign<0?'WristL':'WristR';
   panel(wrist,.048,.068,.020,0,.035,.026,dark,.009);
   const cuff=new T.CylinderGeometry(.044,.046,.025,8,1,true);cuff.translate(0,.185,0);rigged(cuff,sign<0?'LowerArmL':'LowerArmR',dark);
  }
  const collar=new T.CylinderGeometry(.076,.086,.026,12,1,true);collar.translate(0,-.029,.017);rigged(collar,'Neck',dark);
  panel('Hips',.302,.031,.184,0,.031,0,dark,.010);
  panel('Hips',.043,.038,.014,0,.031,.101,trim,.006);
  if(a.character==='ghost'){
   const mask=new T.SphereGeometry(.125,12,6,0,Math.PI,Math.PI*.39,Math.PI*.39);mask.scale(.92,.72,.84);mask.translate(0,-.005,.07);rigged(mask,'Head',dark);
   for(const x of[-.086,.086])panel('Head',.019,.009,.014,x,.060,.095,trim,.004);
  }
 }

 if(a.backpack){
  const pack=a.cosmetic==='heart'?0x744b71:a.cosmetic==='aurora'?0x456775:a.cosmetic==='scholar'?0x4a596c:a.upper===2?0x354952:0x657150;
  // A shaped textile pack replaces the previous spherical lump. Its outline
  // persists in the distance model while small hardware is omitted.
  panel('Chest',.298,.369,.157,0,-.057,-.188,pack,.040);
  if(!distant){
   panel('Chest',.214,.171,.040,0,-.103,-.279,tint(pack,.81),.018);
   for(const sign of[-1,1]){
    panel('Chest',.047,.145,.085,sign*.148,-.071,-.193,tint(pack,.71),.014);
    // Front straps curve over the shoulders and down the rear of the pack.
    pipe('Chest',[[sign*.115,-.115,.147],[sign*.129,.064,.133],[sign*.105,.149,-.007],[sign*.103,.058,-.183],[sign*.099,-.125,-.226]],.011,dark,8);
    panel('Chest',.024,.029,.011,sign*.116,-.060,.154,trim,.004);
   }
   pipe('Chest',[[-.086,-.016,-.302],[0,-.008,-.304],[.086,-.016,-.302]],.0036,trim,5);
   pipe('Chest',[[-.025,.124,-.178],[-.024,.151,-.175],[.024,.151,-.175],[.025,.124,-.178]],.0065,dark,5);
  }
 }
}
