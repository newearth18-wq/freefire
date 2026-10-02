import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';

// Authored silhouettes in metres. Forward is -Z; the grip stays at the baked hand anchor.
// Five shared PBR finishes, merged once per weapon/skin rather than hundreds of meshes per actor.
export function buildWeapon(spec,style){
 const group=new T.Group(),finishes=[
  new T.MeshStandardMaterial({color:0x27313b,metalness:.8,roughness:.32}),
  new T.MeshStandardMaterial({color:0x101921,metalness:.08,roughness:.78}),
  new T.MeshStandardMaterial({color:style.base,metalness:.42,roughness:.38}),
  new T.MeshStandardMaterial({color:style.accent,metalness:.55,roughness:.30}),
  new T.MeshStandardMaterial({color:0x71878e,metalness:.85,roughness:.24})
 ],bins=finishes.map(()=>[]);
 const add=(geometry,finish=0,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{const matrix=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)),new T.Vector3(1,1,1));geometry.applyMatrix4(matrix);bins[finish].push(geometry.index?geometry.toNonIndexed():geometry);if(geometry.index)geometry.dispose()};
 const slab=(outline,width,finish=0)=>{const s=new T.Shape();outline.forEach(([z,y],i)=>i?s.lineTo(z,y):s.moveTo(z,y));s.closePath();const bevel=Math.min(.003,width/5),g=new T.ExtrudeGeometry(s,{depth:width-2*bevel,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,curveSegments:3,steps:1});g.translate(0,0,-width/2+bevel);g.rotateY(-Math.PI/2);add(g,finish)};
 const plate=(w,h,d,finish,x,y,z,rx=0)=>{const s=new T.Shape(),r=Math.min(w,h)*.12;s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const g=new T.ExtrudeGeometry(s,{depth:Math.max(.001,d-.004),bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1,curveSegments:2});g.translate(0,0,-d/2+.002);add(g,finish,x,y,z,rx)};
 const tube=(r,len,finish,x,y,z,r2=r)=>add(new T.CylinderGeometry(r,r2,len,12),finish,x,y,z,Math.PI/2);
 const muzzle=(z,r=.021)=>{tube(r,.040,0,0,.035,z);add(new T.TorusGeometry(r*.8,r*.20,4,12),4,0,.035,z-.021);add(new T.CircleGeometry(r*.60,12),1,0,.035,z-.022,0,Math.PI);for(const x of[-r,r])plate(.004,.012,.023,1,x,.035,z)};
 const grip=(z=.12,finish=1)=>{slab([[z-.026,-.035],[z+.034,-.032],[z+.081,-.17],[z+.008,-.186],[z-.022,-.055]],.060,finish);for(let n=0;n<4;n++)plate(.065,.005,.046,0,0,-.075-n*.021,z+.018+n*.009);add(new T.TorusGeometry(.043,.005,4,12),0,0,-.065,z-.030,0,Math.PI/2)};
 const rail=(start,end,y=.10)=>{plate(.051,.012,end-start,0,0,y,(start+end)/2);const count=Math.min(12,Math.floor((end-start)/.024));for(let n=0;n<count;n++)plate(.068,.008,.012,4,0,y+.010,start+.012+n*.024)};
 const vents=(start,end,width=.085,y=.019)=>{for(const sign of[-1,1])for(let n=0;n<5;n++)plate(.003,.013,.022,1,sign*(width/2+.003),y,start+(end-start)*n/4)};
 const stock=(start,end,finish=2,folding=false)=>{if(folding){for(const x of[-.025,.025])tube(.007,end-start,4,x,-.03,(start+end)/2);plate(.070,.11,.018,1,0,-.060,end);return}slab([[start,.045],[end-.018,.053],[end,.020],[end,-.13],[end-.045,-.141],[start+.057,-.052],[start,-.04]],.077,finish);plate(.085,.164,.019,1,0,-.041,end);plate(.082,.031,(end-start)*.55,1,0,.025,start+(end-start)*.5)};
 const magazine=(z=-.02,length=.205,curved=false)=>{slab(curved?[[z-.036,-.048],[z+.035,-.05],[z+.045,-.14],[z+.085,-length],[z+.016,-length-.018],[z-.022,-.151]]:[[z-.036,-.048],[z+.033,-.05],[z+.045,-length],[z-.025,-length-.008]],.052,0);for(const sign of[-1,1])for(let n=0;n<2;n++)plate(.003,length*.62,.006,1,sign*.028,-length*.59,z+(n-.5)*.024,curved?-.18:0);plate(.062,.014,.071,1,0,-length-.005,z+.012)};
 const scope=(z=0,long=false)=>{const len=long?.33:.20;for(const rz of[-.056,.057])plate(.044,.042,.036,0,0,.105,z+rz);tube(.025,len,0,0,.157,z);tube(long?.043:.032,.065,0,0,.157,z-len/2+.021);tube(.031,.045,1,0,.157,z+len/2-.014);add(new T.TorusGeometry(long?.035:.024,.005,4,12),3,0,.157,z-len/2-.013);add(new T.CircleGeometry(long?.029:.019,12),2,0,.157,z-len/2-.014,0,Math.PI);add(new T.CylinderGeometry(.013,.013,.020,10),0,.035,.157,z,0,0,Math.PI/2);add(new T.CylinderGeometry(.013,.013,.020,10),4,0,.190,z)};
 const receiver=(start=-.13,end=.16,height=.10,width=.079)=>slab([[start,-height*.47],[start,height*.27],[start+.027,height*.51],[end-.035,height*.51],[end,height*.17],[end,-height*.49]],width,0);
 const id=spec.id;
 if(id==='deagle'){
  slab([[-.155,.020],[-.155,.099],[.105,.099],[.138,.056],[.122,.022]],.071,4);slab([[-.11,-.02],[-.11,.028],[.105,.028],[.132,-.017],[.031,-.028]],.063,2);grip(.058);muzzle(-.17,.021);plate(.078,.014,.019,1,0,.107,-.131);plate(.077,.014,.024,1,0,.107,.088);for(let n=0;n<5;n++)plate(.003,.040,.006,1,.039,.063,.040+n*.014);
 }else if(id==='mp40'){
  tube(.036,.29,0,0,.026,-.010);tube(.021,.21,0,0,.026,-.25);muzzle(-.365);plate(.066,.045,.19,2,0,-.015,.012);grip(.11);magazine(-.095,.246);stock(.13,.37,0,true);plate(.011,.029,.075,4,.042,.033,.025);plate(.05,.020,.023,1,0,.072,-.131);
 }else if(id==='vector'){
  slab([[-.11,.082],[.101,.082],[.133,.038],[.111,-.146],[.023,-.18],[-.105,-.119]],.091,2);tube(.022,.16,0,0,.038,-.17);muzzle(-.265);grip(.16);magazine(.084,.27);stock(.20,.39,0,true);rail(-.12,.15,.096);plate(.096,.07,.076,1,0,-.053,-.10);vents(-.10,.08,.096,.029);
 }else if(id==='m1887'||id==='m1014'){
  const lever=id==='m1887';receiver(-.11,.14,.083,.071);tube(.025,.57,0,0,.035,-.37);tube(.018,.43,0,0,-.012,-.34);muzzle(-.67,.025);slab([[-.48,-.053],[-.47,.016],[-.21,.009],[-.18,-.043]],.075,2);stock(.16,.42,2);grip(.12,2);if(lever){add(new T.TorusGeometry(.061,.006,4,18,Math.PI*1.8),4,0,-.098,.128,0,Math.PI/2)}else{rail(-.09,.11,.076);for(let n=0;n<6;n++)plate(.078,.008,.008,1,0,-.014,-.44+n*.035)}
 }else if(id==='awm'||id==='sks'){
  const sniper=id==='awm';receiver(-.14,.17,.086,.073);tube(.019,sniper?.59:.47,0,0,.035,sniper?-.43:-.36);muzzle(sniper?-.742:-.61,.024);slab([[-.32,-.043],[-.30,.008],[.17,.008],[.24,-.053],[.28,-.111],[.36,-.13],[.405,-.105],[.408,-.169],[.31,-.174],[.21,-.13],[.15,-.061]],.072,2);stock(.21,.47,2);magazine(-.004,sniper?.143:.213,!sniper);scope(-.011,sniper);tube(.009,.057,4,.061,.042,.097);add(new T.SphereGeometry(.016,8,6),1,.064,.035,.126);if(sniper)for(const sign of[-1,1])plate(.008,.22,.011,0,sign*.048,-.068,-.36,sign*.07);
 }else if(id==='groza'){
  receiver(-.15,.29,.13,.093);slab([[-.18,-.051],[-.18,.043],[-.055,.071],[.105,.023],[.145,-.05]],.099,2);tube(.022,.19,0,0,.035,-.24);muzzle(-.355);grip(-.04);magazine(.209,.235,true);stock(.26,.41,2);rail(-.13,.25,.113);vents(-.13,.004,.10);plate(.04,.106,.051,1,0,-.069,-.161);
 }else if(id==='mag7'){
  slab([[-.21,-.038],[-.21,.076],[.075,.076],[.129,.015],[.117,-.051]],.098,2);tube(.028,.11,0,0,.034,-.245);muzzle(-.32,.031);grip(.081);magazine(.052,.240);rail(-.18,.095,.093);plate(.106,.057,.098,1,0,-.038,-.162);vents(-.14,.01,.102,.033);
 }else if(id==='m60'){
  receiver(-.17,.20,.13,.10);tube(.027,.49,0,0,.035,-.43);muzzle(-.71,.031);slab([[-.42,-.034],[-.40,.026],[-.17,.026],[-.16,-.032]],.098,1);plate(.12,.025,.28,2,0,.08,.009);stock(.19,.40,2);grip(.12);plate(.155,.141,.126,1,-.107,-.074,-.025);for(let n=0;n<6;n++)tube(.008,.059,3,-.14+n*.017,.019,-.073);for(const sign of[-1,1])plate(.011,.244,.018,4,sign*.075,-.097,-.44);rail(-.10,.10,.107);
 }else{
  const ak=id==='ak',scar=id==='scar',ump=id==='ump';receiver(ump?-.16:-.13,.17,ump?.10:.103,ump?.08:.075);tube(.021,ump?.18:.29,0,0,.035,ump?-.24:-.35);muzzle(ump?-.345:-.515,.024);
  slab(ak?[[-.33,-.039],[-.32,.044],[-.13,.047],[-.12,-.036]]:[[-.33,-.047],[-.32,.048],[-.15,.062],[-.12,-.037]],scar?.094:.086,2);grip(.12);magazine(ump?-.061:-.028,ump?.235:.237,ak);stock(.19,ump?.39:scar?.46:.43,2,ump);vents(-.29,-.16,scar?.094:.086);if(ak){tube(.012,.21,0,0,.077,-.34);plate(.019,.037,.025,0,0,.080,-.423)}else rail(-.29,.13,.086);if(scar){plate(.080,.030,.159,1,0,.062,.331);plate(.024,.027,.026,4,-.052,.009,.117)}if(id==='m4')tube(.024,.16,0,0,.004,.225);
 }
 // Ejection port, selector, screws and contrasting enamel strips remain small.
 if(id!=='deagle'){plate(.003,.023,.076,1,.052,.022,.051);plate(.004,.007,.044,4,.054,.031,.036);for(const z of[-.056,.091])add(new T.CylinderGeometry(.006,.006,.005,8),4,-.047,.002,z,0,0,Math.PI/2);plate(.004,.014,.031,3,-.050,.006,.066);for(const sign of[-1,1])plate(.003,.009,id==='mp40'?.13:.17,3,sign*.049,.048,-.010)}
 if(spec.fixedScope&&!['awm','sks'].includes(id))scope();
 const heart=new T.Shape();heart.moveTo(0,-.011);heart.bezierCurveTo(-.020,.003,-.012,.020,0,.010);heart.bezierCurveTo(.012,.020,.020,.003,0,-.011);for(const sign of[-1,1])add(new T.ShapeGeometry(heart,3),3,sign*.055,.008,.020,0,sign*Math.PI/2);
 bins.forEach((geometries,i)=>{if(!geometries.length){finishes[i].dispose();return}const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());const mesh=new T.Mesh(geometry,finishes[i]);mesh.name=['Machined metal','Polymer','Enamel','Inlays','Satin hardware'][i];mesh.userData.sharedWeapon=true;group.add(mesh)});
 group.userData.design=id;return group;
}
