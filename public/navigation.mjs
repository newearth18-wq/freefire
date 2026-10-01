import {STATIC_SOLIDS,groundHeight,rayBox} from './arena.mjs';
const R=111,N=R*2+1,blocked=new Uint8Array(N*N);
const key=(x,z)=>(z+R)*N+x+R;
for(let z=-R;z<=R;z++)for(let x=-R;x<=R;x++)if(Math.hypot(x,z)>110)blocked[key(x,z)]=1;
for(const s of STATIC_SOLIDS){
 for(let z=Math.max(-R,Math.ceil(s.z-s.d-.55));z<=Math.min(R,Math.floor(s.z+s.d+.55));z++)
 for(let x=Math.max(-R,Math.ceil(s.x-s.w-.55));x<=Math.min(R,Math.floor(s.x+s.w+.55));x++){
  const feet=groundHeight(x,z)+.05;if(feet+2>s.y+.05&&feet<=s.y+s.h-.05)blocked[key(x,z)]=1;
 }
}
function nearest(x,z){x=Math.max(-R,Math.min(R,Math.round(x)));z=Math.max(-R,Math.min(R,Math.round(z)));for(let r=0;r<=6;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;const a=x+dx,b=z+dz;if(Math.abs(a)<=R&&Math.abs(b)<=R&&!blocked[key(a,b)])return{x:a,z:b}}return null}
// Check a swept player footprint, including temporary walls. Roofs and lintels
// above the player's head do not close a navigable doorway.
export function clearRoute(a,b,solids=STATIC_SOLIDS){const length=Math.hypot(b.x-a.x,b.z-a.z);if(length<.01)return true;const direction={x:(b.x-a.x)/length,y:0,z:(b.z-a.z)/length},origin={x:a.x,y:groundHeight(a.x,a.z)+1,z:a.z};for(const s of solids){if(origin.y<s.y||origin.y>s.y+s.h)continue;if(rayBox(origin,direction,{...s,w:s.w+.49,d:s.d+.49},length)!==null)return false}return true}
class Heap{
 values=[];
 push(value){const a=this.values;a.push(value);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].f<=value.f)break;a[i]=a[p];i=p}a[i]=value}
 pop(){const a=this.values,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].f<a[c].f)c++;if(a[c].f>=last.f)break;a[i]=a[c];i=c}a[i]=last}return first}
}
export function findRoute(a,b,solids=STATIC_SOLIDS){
 if(clearRoute(a,b,solids))return[{x:b.x,z:b.z}];const start=nearest(a.x,a.z),end=nearest(b.x,b.z);if(!start||!end)return[];
 const costs=new Map(),parents=new Map(),heap=new Heap(),startKey=key(start.x,start.z),endKey=key(end.x,end.z);costs.set(startKey,0);heap.push({...start,id:startKey,g:0,f:Math.hypot(end.x-start.x,end.z-start.z)});
 const dynamic=solids.filter(s=>s.wall);const occupied=(x,z)=>blocked[key(x,z)]||dynamic.some(s=>Math.abs(x-s.x)<s.w+.55&&Math.abs(z-s.z)<s.d+.55);
 let found=false;for(let n=0;n<6500&&heap.values.length;n++){const cur=heap.pop();if(cur.g!==costs.get(cur.id))continue;if(cur.id===endKey){found=true;break}
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const x=cur.x+dx,z=cur.z+dz;if(Math.abs(x)>R||Math.abs(z)>R||occupied(x,z)||dx&&dz&&(occupied(cur.x+dx,cur.z)||occupied(cur.x,cur.z+dz)))continue;const id=key(x,z),g=cur.g+(dx&&dz?Math.SQRT2:1);if(g>=(costs.get(id)??Infinity))continue;costs.set(id,g);parents.set(id,cur.id);heap.push({x,z,id,g,f:g+Math.hypot(end.x-x,end.z-z)})}
 }
 if(!found)return[];const route=[];for(let id=endKey;id!==startKey;id=parents.get(id)){route.push({x:id%N-R,z:Math.floor(id/N)-R});if(route.length>1000)return[]}route.reverse();
 // Keep only safe turning points. Never smooth a route through a wall.
 const result=[];let origin=a;for(let i=0;i<route.length;){let next=i;while(next+1<route.length&&clearRoute(origin,route[next+1],solids))next++;result.push(route[next]);origin=route[next];i=next+1}if(clearRoute(origin,b,solids))result.push({x:b.x,z:b.z});return result;
}
