// Pointer events only emit pointerdown for the first held mouse button.
// Mouse events emit each button transition, so aiming and firing can overlap.
export function bindDesktopMouse({canvas,target,canPlay,start,primary,secondary}){
 let left=false,right=false,pointerType='mouse';const listeners=[];
 const listen=(node,name,handler)=>{node.addEventListener(name,handler);listeners.push([node,name,handler])};
 const reset=()=>{if(left){left=false;primary(false)}if(right){right=false;secondary(false)}};
 listen(canvas,'pointerdown',event=>{pointerType=event.pointerType||'mouse'});
 listen(canvas,'mousedown',event=>{if(pointerType==='touch'||event.sourceCapabilities?.firesTouchEvents||!canPlay()||![0,2].includes(event.button))return;start();if(event.button===0&&!left){left=true;primary(true)}if(event.button===2&&!right){right=true;secondary(true)}event.preventDefault()});
 listen(target,'mouseup',event=>{if(event.button===0&&left){left=false;primary(false)}if(event.button===2&&right){right=false;secondary(false)}});
 listen(target,'blur',reset);
 listen(target,'pointercancel',event=>{if(event.pointerType!=='touch')reset()});
 return{reset,dispose:()=>{reset();for(const[node,name,handler]of listeners)node.removeEventListener(name,handler)}};
}
