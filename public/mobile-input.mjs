// Pointer ownership is independent for walking, looking and firing. A second
// finger must not steal the first finger's joystick or camera capture.
export function bindMobilePointers({joystick,stick,lookArea,fireButton,active,onMove,onLook,onFire,unlock=()=>{},events=globalThis}){
 let walk=null,look=null,fire=null;
 const allowed=e=>(e.button===undefined||e.button===0)&&active();
 const capture=(el,e)=>{try{el.setPointerCapture(e.pointerId)}catch{};e.preventDefault();e.stopPropagation();unlock()};
 const move=e=>{const r=joystick.getBoundingClientRect(),radius=r.width*.34,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,length=Math.hypot(dx,dy),visual=Math.min(1,radius/Math.max(1,length));
  const strength=Math.max(0,Math.min(1,(length-4)/(radius-4))),factor=length?strength/length:0;
  onMove({x:dx*factor||0,y:dy*factor||0});stick.style.transform=`translate(${dx*visual}px,${dy*visual}px)`;
 };
 function stop(e){if(walk===e.pointerId){walk=null;onMove({x:0,y:0});stick.style.transform=''}if(look?.id===e.pointerId)look=null;if(fire===e.pointerId){fire=null;onFire(false)}}
 joystick.addEventListener('pointerdown',e=>{if(walk!==null||!allowed(e))return;walk=e.pointerId;capture(joystick,e);move(e)});
 joystick.addEventListener('pointermove',e=>{if(walk===e.pointerId&&active())move(e)});
 lookArea.addEventListener('pointerdown',e=>{if(look||!allowed(e))return;look={id:e.pointerId,x:e.clientX,y:e.clientY};capture(lookArea,e)});
 fireButton.addEventListener('pointerdown',e=>{if(fire!==null||!allowed(e))return;fire=e.pointerId;if(!look)look={id:e.pointerId,x:e.clientX,y:e.clientY};capture(fireButton,e);onFire(true)});
 events.addEventListener('pointermove',e=>{if(look?.id!==e.pointerId||!active())return;const dx=e.clientX-look.x,dy=e.clientY-look.y;look.x=e.clientX;look.y=e.clientY;onLook(dx,dy)});
 for(const name of ['pointerup','pointercancel'])events.addEventListener(name,stop);
 for(const element of [joystick,lookArea,fireButton])element.addEventListener('lostpointercapture',stop);
 return{reset(){walk=look=fire=null;onMove({x:0,y:0});onFire(false);stick.style.transform=''}};
}
