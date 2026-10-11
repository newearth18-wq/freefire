import {STATIC_SOLIDS,groundHeight,rayBox,ACTIVE_MAP,nearbySolids} from './arena.mjs';
let R,N,blocked;const grids=new Map();
let score,parents,seen,epoch=0;
const key=(x,z)=>(z+R)*N+x+R;
function ensureGrid(){if(grids.has(ACTIVE_MAP.id)){({R,N,blocked}=grids.get(ACTIVE_MAP.id));return}R=ACTIVE_MAP.playRadius-1;N=R*2+1;blocked=new Uint8Array(N*N);
 // Check the circular boundary on visited cells instead of scanning a million
 // empty cells when the first bot needs a route on the enlarged island.
 for(const s of STATIC_SOLIDS.filter(s=>s.type!=='stairs'))for(let z=Math.max(-R,Math.ceil(s.z-s.d-.55));z<=Math.min(R,Math.floor(s.z+s.d+.55));z++)for(let x=Math.max(-R,Math.ceil(s.x-s.w-.55));x<=Math.min(R,Math.floor(s.x+s.w+.55));x++){const feet=groundHeight(x,z)+.05;if(feet+2>s.y+.05&&feet<=s.y+s.h-.05)blocked[key(x,z)]=1}
 grids.set(ACTIVE_MAP.id,{R,N,blocked});
}
function nearest(x,z){const ox=x,oz=z;x=Math.max(-R,Math.min(R,Math.round(x)));z=Math.max(-R,Math.min(R,Math.round(z)));for(let r=0;r<=6;r++){let best=null,distance=Infinity;for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;const a=x+dx,b=z+dz,d=(a-ox)**2+(b-oz)**2;if(a*a+b*b<=(R-1)**2&&!blocked[key(a,b)]&&d<distance){best={x:a,z:b};distance=d}}if(best)return best}return null}
// Check a swept player footprint, including temporary walls. Roofs and lintels
// above the player's head do not close a navigable doorway.
export function clearRoute(a,b,solids=STATIC_SOLIDS){const length=Math.hypot(b.x-a.x,b.z-a.z);if(length<.01)return true;const direction={x:(b.x-a.x)/length,y:0,z:(b.z-a.z)/length},origin={x:a.x,y:groundHeight(a.x,a.z)+1,z:a.z};for(const s of nearbySolids(solids,Math.min(a.x,b.x)-.5,Math.min(a.z,b.z)-.5,Math.max(a.x,b.x)+.5,Math.max(a.z,b.z)+.5)){if(origin.y<s.y||origin.y>s.y+s.h)continue;if(rayBox(origin,direction,{...s,w:s.w+.49,d:s.d+.49},length)!==null)return false}return true}
class Heap{
 values=[];
 push(value){const a=this.values;a.push(value);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].f<=value.f)break;a[i]=a[p];i=p}a[i]=value}
 pop(){const a=this.values,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].f<a[c].f)c++;if(a[c].f>=last.f)break;a[i]=a[c];i=c}a[i]=last}return first}
}
export function findRoute(a,b,solids=STATIC_SOLIDS){ensureGrid();
 if(clearRoute(a,b,solids))return[{x:b.x,z:b.z}];const start=nearest(a.x,a.z),end=nearest(b.x,b.z);if(!start||!end)return[];
 // One reusable search workspace avoids allocating thousands of Map entries
 // for every bot. Integer costs preserve exact stale-entry comparisons.
 if(!score||score.length!==N*N){score=new Float32Array(N*N);parents=new Int32Array(N*N);seen=new Uint32Array(N*N);epoch=0}if(++epoch===0xffffffff){seen.fill(0);epoch=1}
 const heap=new Heap(),startKey=key(start.x,start.z),endKey=key(end.x,end.z),heuristic=(x,z)=>Math.hypot(end.x-x,end.z-z)*1000;score[startKey]=0;seen[startKey]=epoch;heap.push({...start,id:startKey,g:0,f:heuristic(start.x,start.z)*1.2});
 const dynamic=solids.filter(s=>s.wall);const occupied=(x,z)=>x*x+z*z>(R-1)**2||blocked[key(x,z)]||dynamic.some(s=>Math.abs(x-s.x)<s.w+.55&&Math.abs(z-s.z)<s.d+.55);
 let found=false,best=startKey,bestDistance=heuristic(start.x,start.z);for(let n=0;n<1200&&heap.values.length;n++){const cur=heap.pop();if(cur.g!==score[cur.id])continue;const distance=heuristic(cur.x,cur.z);if(distance<bestDistance){best=cur.id;bestDistance=distance}if(cur.id===endKey){found=true;break}
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const x=cur.x+dx,z=cur.z+dz;if(Math.abs(x)>R||Math.abs(z)>R||occupied(x,z)||dx&&dz&&(occupied(cur.x+dx,cur.z)||occupied(cur.x,cur.z+dz)))continue;const id=key(x,z),g=cur.g+(dx&&dz?1414:1000);if(seen[id]===epoch&&g>=score[id])continue;score[id]=g;seen[id]=epoch;parents[id]=cur.id;heap.push({x,z,id,g,f:g+heuristic(x,z)*1.2})}
 }
 if(!found&&best===startKey)return[];const route=[];for(let id=found?endKey:best;id!==startKey;id=parents[id]){route.push({x:id%N-R,z:Math.floor(id/N)-R});if(route.length>1200)return[]}route.reverse();
 // Keep only safe turning points. Never smooth a route through a wall.
 // Probe forward exponentially, then bisect. A long straight route needs
 // logarithmic ray checks rather than one full obstacle scan per metre.
 const result=[];let origin=a;for(let i=0;i<route.length;){let next=i,stride=1;while(next+stride<route.length&&clearRoute(origin,route[next+stride],solids)){next+=stride;stride*=2}let high=Math.min(route.length-1,next+stride);while(high>next+1){const mid=(next+high)>>1;if(clearRoute(origin,route[mid],solids))next=mid;else high=mid}if(high===next+1&&clearRoute(origin,route[high],solids))next=high;result.push(route[next]);origin=route[next];i=next+1}if(clearRoute(origin,b,solids))result.push({x:b.x,z:b.z});return result;
}
