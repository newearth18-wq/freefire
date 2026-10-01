// Procedural effects are generated locally; no audio downloads or microphone access.
export class GameAudio{
 constructor(){this.context=null;this.master=null;this.muted=false;this.volume=.65;this.active=0;this.played={};this.step=0;this.previous={};try{const saved=JSON.parse(localStorage.getItem('lastIsland.audio'));this.muted=saved?.muted===true;if(Number.isFinite(saved?.volume))this.volume=Math.max(0,Math.min(1,saved.volume))}catch{}}
 unlock(){try{if(!this.context){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;this.context=new Context();this.master=this.context.createGain();this.master.gain.value=this.muted?0:this.volume;const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-14;limiter.knee.value=16;limiter.ratio.value=5;this.master.connect(limiter);limiter.connect(this.context.destination);const count=this.context.sampleRate*2;this.noise=this.context.createBuffer(1,count,this.context.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<count;i++)data[i]=Math.random()*2-1}this.context.resume().catch(()=>{})}catch{}}
 save(){try{localStorage.setItem('lastIsland.audio',JSON.stringify({muted:this.muted,volume:this.volume}))}catch{}}
 setMuted(value){this.muted=!!value;this.apply();this.save()}
 setVolume(value){this.volume=Math.max(0,Math.min(1,Number(value)||0));this.apply();this.save()}
 apply(){if(this.master)this.master.gain.setTargetAtTime(this.muted?0:this.volume,this.context.currentTime,.025)}
 snapshot(){return{available:!!(window.AudioContext||window.webkitAudioContext),unlocked:!!this.context,state:this.context?.state??'locked',muted:this.muted,volume:this.volume,activeVoices:this.active,effectsPlayed:{...this.played}}}
 play(name,{weapon=0,distance=0,pan=0}={}){const c=this.context;if(!c||c.state!=='running'||this.muted||this.volume===0||this.active>=32||distance>65)return;this.played[name]=(this.played[name]??0)+1;const bus=c.createGain(),stereo=c.createStereoPanner();stereo.pan.value=Math.max(-1,Math.min(1,pan));bus.gain.value=1/(1+distance*.085);bus.connect(stereo);stereo.connect(this.master);this.active++;const now=c.currentTime,nodes=[];let end=now+.01;
  const oscillator=(frequency,finish,duration,volume,type='sine',delay=0)=>{const source=c.createOscillator(),gain=c.createGain(),start=now+delay;source.type=type;source.frequency.setValueAtTime(frequency,start);source.frequency.exponentialRampToValueAtTime(Math.max(20,finish),start+duration);gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(volume,start+.006);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);source.connect(gain);gain.connect(bus);source.start(start);source.stop(start+duration);nodes.push(source,gain);end=Math.max(end,start+duration);};
  const noise=(frequency,duration,volume,type='lowpass',delay=0)=>{const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),start=now+delay;source.buffer=this.noise;filter.type=type;filter.frequency.value=frequency;gain.gain.setValueAtTime(volume,start);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);source.connect(filter);filter.connect(gain);gain.connect(bus);source.start(start,Math.random());source.stop(start+duration);nodes.push(source,filter,gain);end=Math.max(end,start+duration);};
  switch(name){
   case'gun':noise(weapon===2?1300:weapon===1?3100:2200,weapon===2?.22:.12,weapon===2?.38:.23);oscillator(weapon===2?115:175,38,weapon===2?.20:.10,.19);noise(7500,.055,.06,'highpass',.055);break;
   case'ui':oscillator(900,700,.055,.025,'triangle');break;
   case'queue':oscillator(440,660,.14,.035,'sine');oscillator(660,880,.14,.035,'sine',.13);break;
   case'countdown':oscillator(740,740,.12,.06);break;
   case'hit':oscillator(700,320,.055,.05,'triangle');noise(4500,.04,.03,'highpass');break;
   case'headshot':oscillator(1200,1500,.08,.06);oscillator(1500,1900,.08,.04,'sine',.07);break;
   case'damage':noise(550,.14,.13);oscillator(130,45,.13,.09);break;
   case'footstep':noise(500,.065,.075);oscillator(75,45,.055,.025);break;
   case'jump':noise(1200,.12,.04);break;
   case'land':noise(600,.18,.13);oscillator(90,35,.18,.06);break;
   case'reload':noise(6500,.065,.07,'highpass');oscillator(500,270,.065,.025,'square');noise(4000,.06,.07,'highpass',.24);break;
   case'loaded':noise(5200,.06,.065,'highpass');oscillator(220,85,.08,.03,'triangle');break;
   case'heal':oscillator(440,660,.18,.025);oscillator(660,880,.18,.025,'sine',.15);break;
   case'wall':noise(850,.28,.18);oscillator(85,35,.24,.10);break;
   case'pickup':oscillator(650,950,.11,.035,'triangle');oscillator(950,1300,.11,.025,'triangle',.09);break;
   case'down':oscillator(220,70,.40,.055,'triangle');break;
   case'revive':oscillator(440,660,.20,.045);oscillator(660,880,.20,.045,'sine',.17);break;
   case'zone':oscillator(520,400,.22,.035,'triangle');oscillator(520,400,.22,.035,'triangle',.30);break;
   case'win':for(const[n,f]of[523,659,784,1046].entries())oscillator(f,f,.3,.05,'triangle',n*.15);break;
   case'lose':oscillator(330,220,.3,.04,'triangle');oscillator(220,110,.4,.04,'triangle',.22);break;
   default:oscillator(440,220,.05,.02);
  }
  const cleanup=c.createOscillator(),silent=c.createGain();silent.gain.value=0;cleanup.connect(silent);silent.connect(bus);cleanup.onended=()=>{for(const node of nodes)node.disconnect();cleanup.disconnect();silent.disconnect();bus.disconnect();stereo.disconnect();this.active=Math.max(0,this.active-1)};cleanup.start();cleanup.stop(end+.02);
 }
 update(dt,actor,{playing=false,paused=false,drop=0,outside=false}={}){if(!playing||paused||!actor){this.previous={};this.step=0;return}const prev=this.previous;if(prev.drop>0&&drop<=0)this.play('land');if(actor.jump>.1&&!(prev.jump>.1))this.play('jump');if(prev.jump>.1&&actor.jump<=0)this.play('land');if(actor.reload>0&&!(prev.reload>0))this.play('reload');if(prev.reload>0&&actor.reload<=0)this.play('loaded');if(actor.heal>0&&!(prev.heal>0))this.play('heal');if(outside&&!prev.outside)this.play('zone');if(actor.status==='alive'&&drop<=0&&actor.jump<=0&&actor.speed>1){this.step-=dt;if(this.step<=0){this.play('footstep');this.step=actor.speed>7?.24:actor.crouch?.5:.34}}else this.step=0;this.previous={drop,jump:actor.jump,reload:actor.reload,heal:actor.heal,outside}}
}
