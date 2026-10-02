// A rolling local measurement; no analytics or network reporting.
export class FrameMeter {
 constructor(){this.samples=[];this.last=0}
 record(now,cpu,draws,triangles){if(this.last&&now>this.last&&now-this.last<=2000)this.samples.push({frame:now-this.last,cpu,draws,triangles});this.last=now;if(this.samples.length>240)this.samples.shift()}
 read(){const samples=this.samples;if(!samples.length)return{samples:0};const mean=k=>samples.reduce((n,s)=>n+s[k],0)/samples.length,sorted=samples.map(s=>s.frame).sort((a,b)=>a-b);return{samples:samples.length,fps:+(1000/mean('frame')).toFixed(1),frameP95Ms:+sorted[Math.floor((sorted.length-1)*.95)].toFixed(1),cpuMs:+mean('cpu').toFixed(2),drawCalls:Math.round(mean('draws')),triangles:Math.round(mean('triangles'))}}
 reset(){this.samples=[];this.last=0}
}

// Scale is relative to CSS pixels. Auto never sacrifices its native CSS
// resolution on normal phone viewports; supersampling is adjusted gradually.
export class AdaptiveResolution {
 constructor(){this.reset()}
 reset(){this.scale=1.5;this.slow=0;this.fast=0}
 update(stats){
  if(stats.samples<60||!Number.isFinite(stats.fps))return false;
  this.slow=stats.fps<42?this.slow+1:0;
  this.fast=stats.fps>56&&stats.frameP95Ms<24?this.fast+1:0;
  const before=this.scale;
  if(this.slow>=2){this.scale=Math.max(1,this.scale-.125);this.slow=0}
  if(this.fast>=4){this.scale=Math.min(1.5,this.scale+.125);this.fast=0}
  return before!==this.scale;
 }
}

export function renderProfile({quality='auto',width,height,dpr=1,touch=false,scale=1.5}){
 const area=Math.max(1,width*height),density=Math.max(1,Number.isFinite(dpr)?dpr:1);
 const budget=quality==='sharp'?3200000:quality==='smooth'?900000:1800000;
 const target=quality==='sharp'?Math.min(density,2):quality==='smooth'?1:Math.min(density,Math.max(1,Math.min(1.5,scale)));
 return{pixelRatio:Math.min(target,Math.sqrt(budget/area)),shadows:quality==='sharp'&&!touch,detail:quality==='smooth'||touch&&quality==='auto'?'low':'full'};
}
