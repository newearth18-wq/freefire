import * as T from './vendor/three.module.js';
const environments=new Map();
// Small, original reflection environments. Three prefilters each once on first use;
// reflective metal then needs no live cube camera or additional per-frame scene pass.
export function applyEnvironment(scene,studio=false){
 const key=studio?'studio':'island';
 if(!environments.has(key)){
  const lightDirection=new T.Vector3(-.55,.50,-.67).normalize(),width=128,height=64,data=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const theta=(y+.5)/height*Math.PI,phi=(x+.5)/width*Math.PI*2,direction=new T.Vector3(-Math.sin(theta)*Math.cos(phi),Math.cos(theta),Math.sin(theta)*Math.sin(phi));
   const horizon=T.MathUtils.smoothstep(direction.y,-.25,.45),color=new T.Color(studio?0x233547:0x647165).lerp(new T.Color(studio?0x91b0c7:0xc2dce7),horizon);
   // Broad highlights describe bevels and curved receivers without emissive paint.
   const softbox=Math.pow(Math.max(0,direction.dot(lightDirection)),studio?12:40);
   color.lerp(new T.Color(0xfff1d9),softbox*.85).convertLinearToSRGB();
   const n=(y*width+x)*4;data.set([Math.round(color.r*255),Math.round(color.g*255),Math.round(color.b*255),255],n);
  }
  const texture=new T.DataTexture(data,width,height,T.RGBAFormat,T.UnsignedByteType);texture.colorSpace=T.SRGBColorSpace;texture.mapping=T.EquirectangularReflectionMapping;texture.needsUpdate=true;environments.set(key,texture);
 }
 scene.environment=environments.get(key);scene.environmentIntensity=studio?.65:.50;return scene.environment;
}
