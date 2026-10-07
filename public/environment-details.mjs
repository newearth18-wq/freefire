import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
let contactTexture;
export function softContactTexture(){
 if(contactTexture)return contactTexture;const size=64,bytes=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const radius=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2)),a=Math.max(0,1-radius);bytes.set([255,255,255,Math.round(a*a*255)],(y*size+x)*4)}
 contactTexture=new T.DataTexture(bytes,size,size,T.RGBAFormat);contactTexture.needsUpdate=true;return contactTexture;
}
export function treeTrunkGeometry(){
 const parts=[new T.CylinderGeometry(.17,.31,6.5,9)];
 for(let i=0;i<3;i++){const branch=new T.CylinderGeometry(.055,.11,2.25,6),angle=i/3*Math.PI*2,direction=new T.Vector3(Math.sin(angle)*.64,.77,Math.cos(angle)*.64).normalize();branch.applyMatrix4(new T.Matrix4().compose(new T.Vector3(direction.x*.7,.45+i*.18,direction.z*.7),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction),new T.Vector3(1,1,1)));parts.push(branch)}
 const merged=mergeGeometries(parts,false);parts.forEach(part=>part.dispose());return merged;
}
export function canopyGeometry(base){
 const geometry=new T.IcosahedronGeometry(1,1),p=geometry.attributes.position,colors=[],leaf=new T.Color(base);
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),ripple=1+.09*Math.sin(x*5+z*4)*Math.cos(y*3);p.setXYZ(i,x*ripple,y*(1+.07*Math.sin(z*4)),z*ripple);const light=.68+.29*(y+1)/2+.035*Math.sin(x*7+z*3);colors.push(leaf.r*light,leaf.g*light,leaf.b*light)}
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
}
export function terrainTint(map,x,z){
 const radius=Math.hypot(x,z),coast=T.MathUtils.smoothstep(radius,map.playRadius-15,map.playRadius+10),grass=new T.Color(map.grass),sand=new T.Color(map.sand),variation=.90+.12*Math.sin(x*.035+z*.018)*Math.cos(z*.027-x*.013);
 return grass.multiplyScalar(variation).lerp(sand,coast);
}
