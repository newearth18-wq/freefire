import * as T from './vendor/three.module.js';

// Clothing donors are simplified once at loading, before appearance tinting.
// Dominant bone and color boundaries keep joints and separate garment panels.
export function reduceRigGeometry(source,cell=.065){
 const p=source.attributes.position,c=source.attributes.color,n=source.attributes.normal,u=source.attributes.uv,si=source.attributes.skinIndex,sw=source.attributes.skinWeight;
 const bins=new Map(),vertices=[],remap=new Uint32Array(p.count);
 for(let i=0;i<p.count;i++){
  let dominant=0;for(let k=1;k<4;k++)if(sw.array[i*4+k]>sw.array[i*4+dominant])dominant=k;
  const key=[Math.round(p.getX(i)/cell),Math.round(p.getY(i)/cell),Math.round(p.getZ(i)/cell),si.array[i*4+dominant],...(c?[c.getX(i),c.getY(i),c.getZ(i)].map(v=>Math.round(v*5)):[])].join(':');
  let index=bins.get(key);if(index===undefined){index=vertices.length;bins.set(key,index);vertices.push({p:[0,0,0],c:[0,0,0],n:[0,0,0],uv:[0,0],weights:new Map(),count:0})}
  remap[i]=index;const v=vertices[index];v.count++;
  for(let k=0;k<3;k++){v.p[k]+=p.array[i*3+k];v.c[k]+=c?.array[i*3+k]??1;v.n[k]+=n?.array[i*3+k]??0}
  for(let k=0;k<2;k++)v.uv[k]+=u?.array[i*2+k]??0;
  for(let k=0;k<4;k++){const bone=si.array[i*4+k],weight=sw.array[i*4+k];if(weight>0)v.weights.set(bone,(v.weights.get(bone)??0)+weight)}
 }
 const index=source.index?.array??Array.from({length:p.count},(_,i)=>i),triangles=[],seen=new Set();
 for(let i=0;i<index.length;i+=3){const a=remap[index[i]],b=remap[index[i+1]],d=remap[index[i+2]];if(a===b||b===d||a===d)continue;const key=[a,b,d].sort((x,y)=>x-y).join(':');if(seen.has(key))continue;seen.add(key);triangles.push(a,b,d)}
 const position=[],color=[],normal=[],uv=[],skinIndex=[],skinWeight=[];
 for(const v of vertices){position.push(...v.p.map(x=>x/v.count));color.push(...v.c.map(x=>x/v.count));normal.push(...v.n.map(x=>x/v.count));uv.push(...v.uv.map(x=>x/v.count));const weights=[...v.weights].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=weights.reduce((total,e)=>total+e[1],0);for(let k=0;k<4;k++){skinIndex.push(weights[k]?.[0]??0);skinWeight.push((weights[k]?.[1]??0)/(sum||1))}}
 const geometry=new T.BufferGeometry();geometry.setIndex(triangles);geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normal,3));geometry.setAttribute('color',new T.Float32BufferAttribute(color,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndex,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(skinWeight,4));geometry.normalizeNormals();geometry.computeBoundingSphere();return geometry;
}
