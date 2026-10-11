// One description drives both visible rooms and authoritative collision.
export const FLOOR_HEIGHT=3.4;
export function buildingParts(b){
 const parts=[],floor=b.floors===2?FLOOR_HEIGHT:0,height=b.type==='warehouse'?5:floor+3.7,door=b.type==='warehouse'?3.2:2.2;
 const add=(x,z,w,d,y,h,type='wall')=>parts.push({x:b.x+x,z:b.z+z,w:w/2,d:d/2,y,h,type,building:b.id});
 // Real window openings: lower sill, upper lintel and piers have collision;
 // the opening itself stays clear for light, sight and aiming.
 for(const side of[-1,1]){
  const window=Math.min(2.2,b.d*.3),pier=(b.d-window)/2;
  for(let level=0;level<(b.floors??1);level++){const y=level*FLOOR_HEIGHT,top=level===(b.floors??1)-1?height:y+FLOOR_HEIGHT;add(side*b.w/2,0,.3,b.d,y,1.15);add(side*b.w/2,0,.3,b.d,y+2.35,top-y-2.35);for(const sign of[-1,1])add(side*b.w/2,sign*(window+pier)/2,.3,pier,y+1.15,1.2)}
  for(const front of[-1,1]){const section=(b.w-door)/2;add(side*(b.w+door)/4,front*b.d/2,section,.3,0,height)}
 }
 for(const front of[-1,1])add(0,front*b.d/2,door,.3,2.9,height-2.9);
 if(floor){
  const lane=1.9,x=b.w/2-lane/2-.35,run=b.d-2.2;
  // The stairwell is open above the entire flight; a landing connects the floor.
  add(-lane/2-.1,0,b.w-lane-.4,b.d-.3,floor-.18,.18,'floor');
  add(x,b.d/2-.6,lane,1.2,floor-.18,.18,'floor');
  parts.push({x:b.x+x,z:b.z,w:lane/2,d:run/2,y:0,h:floor,type:'stairs',building:b.id,run});
 }
 add(-b.w*.3,b.d*.23,1.2,1.2,0,1.05,'crate');
 add(-b.w*.28,-b.d*.24,1.7,.7,.65,.65,'furniture');
 add(0,0,b.w,b.d,height,.18,'roof');return parts;
}
export function stairHeight(s,z){return s.y+s.h*Math.max(0,Math.min(1,(z-(s.z-s.d))/(s.d*2)))}
