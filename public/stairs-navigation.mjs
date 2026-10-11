import {BUILDINGS,STATIC_SOLIDS,groundHeight} from './arena.mjs';
// A two-dimensional route planner reaches the foot of a staircase first, then
// follows its flight before resuming the upstairs goal. No teleporting bots.
export function stairDestination(e,dest){
 if(e.climbingStairs!==undefined){const active=STATIC_SOLIDS.find(s=>s.type==='stairs'&&s.building===e.climbingStairs);if(active&&e.y<active.y+active.h-.05)return{x:active.x,z:active.z+active.d+.18,y:active.y+active.h,stairWaypoint:true};delete e.climbingStairs}
 if(!Number.isFinite(dest.y)||dest.y-e.y<1.2)return dest;
 const b=BUILDINGS.find(b=>b.floors===2&&Math.abs(dest.x-b.x)<b.w/2&&Math.abs(dest.z-b.z)<b.d/2);if(!b)return dest;
 const stair=STATIC_SOLIDS.find(s=>s.type==='stairs'&&s.building===b.id);if(!stair)return dest;
 const bottom={x:stair.x,z:stair.z-stair.d-.45,y:stair.y,stairWaypoint:true},top={x:stair.x,z:stair.z+stair.d+.18,y:stair.y+stair.h,stairWaypoint:true};
 if(e.climbingStairs!==b.id&&Math.hypot(e.x-bottom.x,e.z-bottom.z)<.8)e.climbingStairs=b.id;
 return e.climbingStairs===b.id?top:bottom;
}
