// A rolling local measurement; no analytics or network reporting.
export class FrameMeter {
 constructor(){this.samples=[];this.last=0}
 record(now,cpu,draws,triangles){if(this.last&&now>this.last&&now-this.last<=2000)this.samples.push({frame:now-this.last,cpu,draws,triangles});this.last=now;if(this.samples.length>240)this.samples.shift()}
 read(){const samples=this.samples;if(!samples.length)return{samples:0};const mean=k=>samples.reduce((n,s)=>n+s[k],0)/samples.length,sorted=samples.map(s=>s.frame).sort((a,b)=>a-b);return{samples:samples.length,fps:+(1000/mean('frame')).toFixed(1),frameP95Ms:+sorted[Math.floor((sorted.length-1)*.95)].toFixed(1),cpuMs:+mean('cpu').toFixed(2),drawCalls:Math.round(mean('draws')),triangles:Math.round(mean('triangles'))}}
 reset(){this.samples=[];this.last=0}
}
