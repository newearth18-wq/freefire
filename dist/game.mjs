import * as T from './vendor/three.module.js';
import {makeWorld,makeAvatar,animateAvatar,setAvatarWeapon,box,material,solids,raySolids,seeded,groundHeight} from './world.mjs';
import {WEAPONS,clamp,zoneAt,canStand,moveSlide,applyDamage,reloadWeapon,formatTime} from './rules.mjs';
const $=id=>document.getElementById(id);
let state='lobby',elapsed=0,hp=100,kills=0,medkits=2,yaw=0,pitch=-.04,fire=false,sprint=false,muted=false;
let player,renderer,camera,scene,weaponIndex=0,weapons=[],reloadLeft=0,reloadDuration=0,healLeft=0,shotLeft=0,toastLeft=0,hitLeft=0,damageLeft=0,uiTick=0;
let bots=[],loot=[],effects=[],rand=Math.random,keys=new Set(),lookPointer=null,joyPointer=null,joy={x:0,y:0};
let aiming=false,crouched=false,jumpHeight=0,jumpVelocity=0,recoil=0,wallCharges=3,wallCooldown=0,barriers=[],labels=[],shootingPointer=null;
let dropHeight=0,parachute;
const cordMaterial=new T.LineBasicMaterial({color:0xe8e7d5});
let audio=null,zoneGroup,zoneRing,zoneWall,zoneRadius=108,ray=new T.Raycaster(),camRay=new T.Raycaster(),aimTarget=null;
const up=new T.Vector3(0,1,0),v=new T.Vector3(),aimVector=new T.Vector3(),muzzle=new T.Vector3(),aimPoint=new T.Vector3();
let touch=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0||innerWidth<=900;
document.body.classList.toggle('touch',touch);
function toast(msg){$('toast').textContent=msg;toastLeft=2.8;$('toast').style.opacity=1}
function tone(freq=280,duration=.06,type='triangle',volume=.025){if(muted||!audio)return;try{const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.25),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch{}}
function unlockAudio(){try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{})}catch{}}
function capturePointer(element,id){try{element.setPointerCapture(id)}catch{}}
function resetInput(){keys.clear();fire=false;sprint=false;aiming=false;shootingPointer=null;joy={x:0,y:0};lookPointer=null;joyPointer=null;$('stick').style.transform='';}
function feed(name,cause){const line=document.createElement('div');line.textContent=name+' · '+cause;$('feed').prepend(line);while($('feed').children.length>4)$('feed').lastChild.remove();}
function disposeObject(object){object.traverse(o=>{o.geometry?.dispose();if(o.userData.disposeMaterial)o.material.dispose()});}
function clearEffects(){for(const e of effects){scene.remove(e.mesh);e.mesh.geometry.dispose();if(e.disposeMaterial)e.mesh.material.dispose()}effects=[]}
function clearMatch(){if(parachute){scene.remove(parachute);parachute.traverse(o=>{if(o.isMesh||o.isLine)o.geometry.dispose()});parachute=null}for(const b of bots){scene.remove(b.mesh);disposeObject(b.mesh)}for(const l of loot){scene.remove(l.mesh);disposeObject(l.mesh)}bots=[];loot=[];clearEffects();for(const wall of [...barriers])removeBarrier(wall);for(const label of labels)label.element.remove();labels=[];}
function spawnPoint(minDistance=10){for(let i=0;i<500;i++){const a=rand()*Math.PI*2,r=15+rand()*78,x=Math.cos(a)*r,z=Math.sin(a)*r;if(canStand(x,z,solids,1.5)&&Math.hypot(x-player.position.x,z-player.position.z)>minDistance)return{x,z}}return{x:0,z:-15};}
function spawnLoot(x,z,type,index=0){const g=new T.Group();const color=type==='weapon'?0xffc96d:type==='med'?0x71edb1:0x87d9e8;
const pad=new T.Mesh(new T.CylinderGeometry(.8,.8,.05,16),material(0x293f3c));pad.position.y=.03;g.add(pad);
if(type==='weapon'){box(g,.2,.24,1.5,color,0,.8,0);box(g,.16,.35,.3,0x213b3e,0,.6,.25)}
else{box(g,.65,.5,.65,type==='med'?0xd2e8d8:0x326d81,0,.7,0);if(type==='med'){box(g,.35,.1,.04,color,0,.7,-.34);box(g,.1,.32,.04,color,0,.7,-.35)}else box(g,.45,.1,.05,color,0,.7,-.34)}
const beam=new T.Mesh(new T.CylinderGeometry(.08,.3,2.5,6,1,true),new T.MeshBasicMaterial({color,transparent:true,opacity:.18,depthWrite:false}));beam.userData.disposeMaterial=true;beam.position.y=1.25;g.add(beam);g.position.set(x,groundHeight(x,z),z);scene.add(g);loot.push({mesh:g,type,index,phase:rand()*6});}
function startMatch(){clearMatch();resetInput();elapsed=0;zoneRadius=108;wallCharges=3;wallCooldown=0;jumpHeight=jumpVelocity=0;crouched=false;recoil=0;hp=100;kills=0;medkits=2;yaw=0;pitch=-.04;shotLeft=reloadLeft=healLeft=0;weaponIndex=0;setAvatarWeapon(player,'ar');player.userData.gun.visible=true;$('headshot').hidden=true;$('hitmarker').style.opacity=0;$('damage').style.opacity=0;$('crouch-touch').classList.remove('active');weapons=WEAPONS.map((spec,i)=>({spec,ammo:spec.mag,reserve:i?70:150,owned:i===0}));dropHeight=30;player.position.set(0,30,24);player.visible=true;parachute=makeParachute();scene.add(parachute);rand=seeded((Date.now()>>>0)||18);
for(let i=0;i<11;i++){const p=spawnPoint(i===0?20:28),mesh=makeAvatar([0x6c8b89,0xae7560,0x82975c,0x6d83a2][i%4]);mesh.position.set(p.x,groundHeight(p.x,p.z),p.z);const bot={mesh,hp:80,name:'ผู้เล่น '+String(i+2).padStart(2,'0'),cooldown:rand()*2+2,strife:rand()<.5?1:-1,wander:rand()*6,stuck:0};mesh.traverse(o=>{if(o.isMesh)o.userData.entity=bot});bots.push(bot);scene.add(mesh)}
spawnLoot(0,17,'weapon',1);spawnLoot(5,24,'ammo');spawnLoot(-5,24,'med');spawnLoot(0,8,'weapon',2);
for(let i=0;i<32;i++){const p=spawnPoint(5);spawnLoot(p.x,p.z,i%5===0?'weapon':i%3===0?'med':'ammo',i%2+1)}
state='playing';document.body.classList.add('playing');$('lobby').hidden=$('brand').hidden=$('result').hidden=$('pause-panel').hidden=true;$('hud').hidden=false;$('feed').replaceChildren();zoneGroup.visible=true;updateCamera(true);updateHud();toast('ร่อนลงเกาะ · ใช้จอยหรือ WASD เลือกจุดลง');unlockAudio();return getMatchState();}
function showLobby(){clearMatch();resetInput();state='lobby';dropHeight=0;crouched=false;animateAvatar(player,0,0);player.userData.gun.visible=true;player.position.set(0,0,24);player.visible=true;zoneGroup.visible=false;document.body.classList.remove('playing');$('lobby').hidden=$('brand').hidden=false;$('hud').hidden=$('result').hidden=$('pause-panel').hidden=true;if(document.pointerLockElement)document.exitPointerLock();}
function pauseGame(paused){if(paused&&state==='playing'){state='paused';resetInput();$('pause-panel').hidden=false;if(document.pointerLockElement)document.exitPointerLock();}else if(!paused&&state==='paused'){state='playing';$('pause-panel').hidden=true;}return getMatchState();}
function finish(win){if(state!=='playing')return;state='ended';updateHud();resetInput();if(document.pointerLockElement)document.exitPointerLock();$('result').hidden=false;$('result-title').textContent=win?'ผู้รอดคนสุดท้าย!':'จบการต่อสู้';$('result-caption').textContent=win?'VICTORY · LAST SURVIVOR':'MATCH COMPLETE';$('result-description').textContent=win?'คุณยึดเกาะนี้ไว้ได้ พร้อมลงสนามอีกครั้งไหม?':'ลองใช้ที่กำบัง เก็บยา และอยู่ในวงปลอดภัย';$('rank').textContent='#'+(win?1:bots.filter(b=>b.hp>0).length+1);$('result-kills').textContent=kills;$('result-time').textContent=formatTime(elapsed);tone(win?720:130,.4,'sine',.05);}
function getMatchState(){return{state,health:Math.ceil(hp),alive:state==='lobby'?0:bots.filter(b=>b.hp>0).length+(hp>0?1:0),kills,phase:dropHeight>0?'landing':'combat',altitude:Math.round(dropHeight),elapsed:Math.floor(elapsed),weapon:weapons[weaponIndex]?.spec.name??null,ammo:weapons[weaponIndex]?.ammo??0,medkits,aiming,crouched,jumping:jumpHeight>0||jumpVelocity>0,wallCharges,barriers:barriers.length,zoneRadius:Math.round(zoneRadius),position:player?{x:Number(player.position.x.toFixed(1)),z:Number(player.position.z.toFixed(1))}:null};}
function reload(){if(state!=='playing'||reloadLeft>0||healLeft>0)return;const w=weapons[weaponIndex];if(w.ammo>=w.spec.mag)return;if(w.reserve<=0){toast('กระสุนสำรองหมด · มองหากล่องสีฟ้า');return}reloadLeft=reloadDuration=w.spec.reload;tone(150,.1);updateHud();}
function heal(){if(state!=='playing'||healLeft>0||reloadLeft>0)return;if(hp>=100){toast('พลังชีวิตเต็มแล้ว');return}if(medkits<=0){toast('ยาหมด · มองหากล่องสีเขียว');return}healLeft=2.3;toast('กำลังรักษา · 2 วินาที');}
function swap(index){if(state!=='playing')return;if(index===undefined){for(let n=1;n<=3;n++){const next=(weaponIndex+n)%3;if(weapons[next].owned){index=next;break}}}if(!weapons[index]?.owned){toast('ยังไม่มีอาวุธนี้ · มองหาอาวุธสีทอง');return}weaponIndex=index;setAvatarWeapon(player,weapons[index].spec.id);reloadLeft=0;shotLeft=.15;updateHud();toast('เปลี่ยนเป็น '+weapons[index].spec.name)}
function killBot(bot,killer='วงบีบ'){if(bot.hp>0)return;bot.mesh.visible=false;feed(bot.name,killer==='คุณ'?'คุณกำจัด':killer);spawnLoot(bot.mesh.position.x,bot.mesh.position.z,'ammo');if(killer==='คุณ'){kills++;tone(640,.15,'sine',.04);toast('กำจัด '+bot.name)}}
function hurtBot(bot,damage,killer){if(bot.hp<=0)return;bot.hp=applyDamage(bot.hp,damage);if(bot.hp===0)killBot(bot,killer)}
function hurtPlayer(damage){hp=applyDamage(hp,damage);const notify=damageLeft<=0;damageLeft=.2;$('damage').style.opacity=.48;if(notify)tone(90,.1,'triangle',.04);if(hp===0)finish(false)}
function lineClear(a,b){v.copy(b).sub(a);const d=v.length();ray.set(a,v.normalize());ray.far=d;return !ray.intersectObjects(raySolids,false).some(h=>h.distance<d-.3);}
function tracer(a,b,color){const geo=new T.BufferGeometry().setFromPoints([a.clone(),b.clone()]);const m=new T.Line(geo,new T.LineBasicMaterial({color,transparent:true,opacity:.9}));scene.add(m);effects.push({mesh:m,left:.08,total:.08,disposeMaterial:true});}
function shoot(){if(state!=='playing'||dropHeight>0||shotLeft>0||reloadLeft>0||healLeft>0)return;const w=weapons[weaponIndex];if(w.ammo<=0){reload();return}w.ammo--;shotLeft=w.spec.rate;tone(w.spec.id==='sg'?100:185,.075,'sawtooth',.018);
const base=new T.Vector3();camera.getWorldDirection(base);
if(touch&&aimTarget){base.copy(aimTarget.mesh.position).add(new T.Vector3(0,1.55,0)).sub(camera.position).normalize();}
muzzle.copy(player.position).add(new T.Vector3(Math.sin(yaw)*-.7+Math.cos(yaw)*.37,crouched?1.11:1.35,-Math.cos(yaw)*.7-Math.sin(yaw)*.37));
const living=bots.filter(b=>b.hp>0).map(b=>b.mesh);const objects=[...raySolids,...living];scene.updateMatrixWorld(true);
for(let n=0;n<w.spec.pellets;n++){aimVector.copy(base);const spread=w.spec.spread*(aiming?.45:crouched?.7:1);aimVector.x+=(rand()-.5)*spread;aimVector.y+=(rand()-.5)*spread;aimVector.z+=(rand()-.5)*spread;aimVector.normalize();ray.set(camera.position,aimVector);ray.far=w.spec.range+8;const hit=ray.intersectObjects(objects,true)[0];aimPoint.copy(hit?hit.point:camera.position.clone().addScaledVector(aimVector,w.spec.range));const bulletDirection=aimPoint.clone().sub(muzzle).normalize();ray.set(muzzle,bulletDirection);ray.far=w.spec.range;const bulletHit=ray.intersectObjects(objects,true)[0];const end=bulletHit?.point??muzzle.clone().addScaledVector(bulletDirection,w.spec.range);tracer(muzzle,end,0xffdd8a);const target=bulletHit?.object.userData.entity;if(target&&target.hp>0){const head=bulletHit.object.userData.part==='head',damage=w.spec.damage*(head?1.9:1);hurtBot(target,damage,'คุณ');damageNumber(bulletHit.point,Math.round(damage),head);hitLeft=head?.5:.18;$('hitmarker').style.opacity=1;$('hitmarker').classList.toggle('headshot',head);$('headshot').hidden=!head;}const barrier=bulletHit?.object.userData.barrier;if(barrier){barrier.health-=w.spec.damage;if(barrier.health<=0)removeBarrier(barrier)}}
player.userData.gun.position.z=-.50;recoil=Math.min(.08,recoil+(w.spec.id==='sg'?.028:.008));flashMuzzle(muzzle);updateHud();}
function updateCamera(snap=false,dt=.016){
  const p=player.position,distance=aiming?3.6:5.8,shoulder=.65,eye=crouched?2.12:2.65;
  const desired=new T.Vector3(p.x+Math.sin(yaw)*distance+Math.cos(yaw)*shoulder,p.y+eye,p.z+Math.cos(yaw)*distance-Math.sin(yaw)*shoulder);
  const anchor=new T.Vector3(p.x,p.y+(crouched?1.2:1.8),p.z),delta=desired.clone().sub(anchor),length=delta.length();
  camRay.set(anchor,delta.normalize());camRay.far=length;const obstacle=camRay.intersectObjects(raySolids,false)[0];
  if(obstacle)desired.copy(anchor).addScaledVector(delta,Math.max(.7,obstacle.distance-.3));
  camera.position.lerp(desired,snap?1:1-Math.exp(-dt*22));
  const viewPitch=pitch+recoil,direction=new T.Vector3(-Math.sin(yaw)*Math.cos(viewPitch),Math.sin(viewPitch),-Math.cos(yaw)*Math.cos(viewPitch));
  camera.lookAt(camera.position.clone().addScaledVector(direction,30));camera.fov+=((aiming?40:60)-camera.fov)*.2;camera.updateProjectionMatrix();
  player.rotation.y=yaw;player.userData.gun.position.z+=(-.58-player.userData.gun.position.z)*.3;
  document.body.classList.toggle('aiming',aiming);$('aim-touch').classList.toggle('active',aiming);
}
function aimAssist(){aimTarget=null;const forward=new T.Vector3();camera.getWorldDirection(forward);let best=.991;for(const b of bots){if(b.hp<=0)continue;const chest=b.mesh.position.clone().add(new T.Vector3(0,1.5,0)),offset=chest.clone().sub(camera.position),d=offset.length();if(d>65)continue;const dot=offset.normalize().dot(forward);if(dot>best&&lineClear(camera.position,chest)){best=dot;aimTarget=b;}}$('crosshair').style.opacity=aimTarget?'1':'.85';$('crosshair').style.filter=aimTarget?'drop-shadow(0 0 4px #ffc062)':'drop-shadow(0 1px 2px #000)';}
function updateBots(dt){const entities=bots.filter(b=>b.hp>0);for(const b of entities){if(b.hp<=0)continue;b.cooldown-=dt;const p=b.mesh.position;let target=null,best=Infinity;
const candidates=[...entities.filter(e=>e!==b),{mesh:player,hp,name:'คุณ',human:true}];
for(const e of candidates){if(e.hp<=0)continue;const d=p.distanceToSquared(e.mesh.position);if(d<best){best=d;target=e}}
const outside=Math.hypot(p.x,p.z)>zoneRadius-4;let destination;const d=Math.sqrt(best);
const from=p.clone().add(new T.Vector3(0,1.45,0));const to=target?.mesh.position.clone().add(new T.Vector3(0,1.4,0));const clear=to&&d<48&&lineClear(from,to);
if(outside)destination=new T.Vector3(0,0,0);
else if(target&&d<60)destination=target.mesh.position;
else{b.wander+=dt*.12;destination=new T.Vector3(Math.sin(b.wander)*Math.min(55,zoneRadius*.65),0,Math.cos(b.wander)*Math.min(55,zoneRadius*.65));}
let dx=destination.x-p.x,dz=destination.z-p.z,length=Math.hypot(dx,dz);if(length>.1){dx/=length;dz/=length}
if(!outside&&clear&&d<24){const ax=dx;dx=dz*b.strife*.7;dz=-ax*b.strife*.7;if(d<10){dx+=(p.x-target.mesh.position.x)/d;dz+=(p.z-target.mesh.position.z)/d}}
const speed=outside?5.2:3.1;const moved=moveSlide(p,dx*speed*dt,dz*speed*dt,solids);
if(moved<speed*dt*.25&&length>2){b.stuck+=dt;const direction=b.strife;moveSlide(p,-dz*direction*speed*dt,dx*direction*speed*dt,solids);if(b.stuck>2){b.strife*=-1;b.stuck=0}}else b.stuck=0;
const face=clear?target.mesh.position:destination;b.mesh.rotation.y=Math.atan2(p.x-face.x,p.z-face.z);p.y=groundHeight(p.x,p.z);animateAvatar(b.mesh,moved/dt,elapsed+b.wander);
if(clear&&!outside&&b.cooldown<=0&&elapsed>3){b.cooldown=1+rand()*1.2;const shotOrigin=p.clone().add(new T.Vector3(0,1.4,0));const end=to.clone().add(new T.Vector3((rand()-.5)*1.5,(rand()-.5)*.5,0));tracer(shotOrigin,end,0xf19772);const hitChance=target.human?(crouched?.28:.4):.65;if(rand()<hitChance){if(target.human)hurtPlayer(7+rand()*3);else hurtBot(target,12+rand()*7,b.name)}}
if(Math.hypot(p.x,p.z)>zoneRadius)hurtBot(b,(5+Math.floor(elapsed/65)*3)*dt,'วงบีบ');}}
function collectLoot(dt){for(let i=loot.length-1;i>=0;i--){const l=loot[i];l.mesh.rotation.y+=dt*.5;const distance=l.mesh.position.distanceTo(player.position);if(distance>1.7)continue;
if(l.type==='ammo'){for(const w of weapons)w.reserve=Math.min(360,w.reserve+35);toast('เก็บกระสุน +35')}
if(l.type==='med'){if(medkits>=5)continue;medkits++;toast('เก็บยา +1')}
if(l.type==='weapon'){const w=weapons[l.index];if(w.owned){w.reserve=Math.min(360,w.reserve+30);toast('กระสุน '+w.spec.name+' +30')}else{w.owned=true;swap(l.index);toast('เก็บ '+w.spec.name+' · E เพื่อเปลี่ยนปืน')}}
tone(550,.09,'sine');scene.remove(l.mesh);disposeObject(l.mesh);loot.splice(i,1);updateHud();}}
function updateHud(){if(!weapons.length)return;const w=weapons[weaponIndex];$('alive').textContent=bots.filter(b=>b.hp>0).length+(hp>0?1:0);$('kills').textContent=kills;$('hp').textContent=Math.ceil(hp);$('health-bar').style.width=hp+'%';$('health-bar').style.background=hp<30?'#ff9471':'#70d3c7';$('ammo').textContent=w.ammo;$('reserve').textContent=w.reserve;$('weapon-name').textContent=w.spec.name;$('weapon-kind').textContent=w.spec.kind;$('med-label').textContent='ยา × '+medkits+' · กำแพง × '+wallCharges;$('wall-count').textContent=wallCharges;for(let i=0;i<3;i++){const slot=$('slot-'+i);slot.disabled=!weapons[i].owned;slot.classList.toggle('selected',i===weaponIndex)}$('reload-progress').hidden=reloadLeft<=0&&healLeft<=0;$('reload-progress').querySelector('b').textContent=healLeft>0?'กำลังรักษา':'กำลังเติมกระสุน';$('reload-progress').querySelector('span').style.transform='scaleX('+(healLeft>0?1-healLeft/2.3:1-reloadLeft/(reloadDuration||1))+')';}
function drawMap(){const c=$('minimap').getContext('2d'),size=180,scale=.73;c.clearRect(0,0,size,size);c.save();c.beginPath();c.arc(90,90,88,0,Math.PI*2);c.clip();c.fillStyle='#1d4140';c.fillRect(0,0,size,size);c.fillStyle='#647257';c.beginPath();c.arc(90,90,112*scale,0,Math.PI*2);c.fill();c.fillStyle='#9b97705c';c.fillRect(87,9,6,162);c.fillRect(24,81,132,4);c.fillStyle='#bad2c16b';for(const s of solids)if(s.w>1)c.fillRect(90+(s.x-s.w)*scale,90+(s.z-s.d)*scale,s.w*2*scale,s.d*2*scale);c.fillStyle='#2aa9c524';c.beginPath();c.rect(0,0,180,180);c.arc(90,90,zoneRadius*scale,0,2*Math.PI,true);c.fill();c.strokeStyle='#74e2db';c.lineWidth=2;c.beginPath();c.arc(90,90,zoneRadius*scale,0,Math.PI*2);c.stroke();for(const b of bots){if(b.hp<=0||b.mesh.position.distanceTo(player.position)>32)continue;c.fillStyle='#ffc062';c.beginPath();c.arc(90+b.mesh.position.x*scale,90+b.mesh.position.z*scale,2.6,0,Math.PI*2);c.fill();}
c.save();c.translate(90+player.position.x*scale,90+player.position.z*scale);c.rotate(-yaw);c.fillStyle='#fff';c.beginPath();c.moveTo(0,-6);c.lineTo(-4,4);c.lineTo(4,4);c.closePath();c.fill();c.restore();c.restore();c.fillStyle='#e0eee7';c.font='bold 10px sans-serif';c.fillText('N',86,14);}
function update(dt){if(dropHeight>0){updateDrop(dt);return}elapsed+=dt;wallCooldown=Math.max(0,wallCooldown-dt);recoil*=Math.exp(-dt*14);for(const wall of [...barriers]){wall.remaining-=dt;if(wall.remaining<=0)removeBarrier(wall)}const zone=zoneAt(elapsed);zoneRadius=zone.radius;zoneGroup.scale.set(Math.max(.001,zoneRadius),1,Math.max(.001,zoneRadius));const outside=Math.hypot(player.position.x,player.position.z)>zoneRadius;$('zone-info').classList.toggle('danger',outside);$('zone-text').textContent=outside?'ออกนอกวง · รีบกลับเข้าวง':(zone.shrinking?'วงกำลังบีบ · ':'วงบีบใน ')+formatTime(Math.ceil(zone.remaining));
shotLeft=Math.max(0,shotLeft-dt);if(reloadLeft>0){reloadLeft-=dt;if(reloadLeft<=0){reloadWeapon(weapons[weaponIndex]);tone(420,.06)}}if(healLeft>0){healLeft-=dt;if(healLeft<=0){hp=Math.min(100,hp+50);medkits--;toast('พลังชีวิต +50');tone(650,.15,'sine')}}
let mx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joy.x,mz=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+joy.y;const len=Math.hypot(mx,mz);if(len>1){mx/=len;mz/=len}const speed=(crouched?2.7:keys.has('ShiftLeft')||keys.has('ShiftRight')||sprint?9:5.7)*(healLeft>0?.4:aiming?.68:1);const dx=(mx*Math.cos(yaw)+mz*Math.sin(yaw))*speed*dt,dz=(-mx*Math.sin(yaw)+mz*Math.cos(yaw))*speed*dt;const moved=moveSlide(player.position,dx,dz,solids);if(jumpHeight>0||jumpVelocity>0){jumpVelocity-=18*dt;jumpHeight=Math.max(0,jumpHeight+jumpVelocity*dt);if(jumpHeight===0)jumpVelocity=0}player.position.y=groundHeight(player.position.x,player.position.z)+jumpHeight;animateAvatar(player,moved/dt,elapsed,crouched);scene.updateMatrixWorld(true);updateCamera(false,dt);aimAssist();if(fire)shoot();updateBots(dt);if(state!=='playing')return;collectLoot(dt);if(outside)hurtPlayer((5+Math.floor(elapsed/65)*3)*dt);if(state!=='playing')return;if(bots.every(b=>b.hp<=0))finish(true);
if(toastLeft>0){toastLeft-=dt;if(toastLeft<=0)$('toast').style.opacity=0}if(hitLeft>0){hitLeft-=dt;if(hitLeft<=0){$('hitmarker').style.opacity=0;$('headshot').hidden=true}}if(damageLeft>0){damageLeft-=dt;if(damageLeft<=0)$('damage').style.opacity=0}uiTick-=dt;if(uiTick<=0){uiTick=.1;updateHud();drawMap();const degrees=((yaw*180/Math.PI)%360+360)%360;const headings=['N','NW','W','SW','S','SE','E','NE'];$('compass').textContent=headings[Math.round(degrees/45)%8]+'  '+Math.round(degrees)+'°';}
for(let i=labels.length-1;i>=0;i--){const label=labels[i];label.left-=dt;if(label.left<=0){label.element.remove();labels.splice(i,1);continue}const screen=label.position.clone();screen.y+=(.8-label.left)*.6;screen.project(camera);label.element.style.left=(screen.x*.5+.5)*innerWidth+'px';label.element.style.top=(-screen.y*.5+.5)*innerHeight+'px';label.element.style.opacity=Math.min(1,label.left*3)}
for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.left-=dt;e.mesh.material.opacity=Math.max(0,e.left/e.total);if(e.left<=0){scene.remove(e.mesh);e.mesh.geometry.dispose();if(e.disposeMaterial)e.mesh.material.dispose();effects.splice(i,1)}}}

function makeParachute(){
 const g=new T.Group(),canopy=new T.Mesh(new T.SphereGeometry(3.7,24,12,0,Math.PI*2,0,Math.PI/2),material(0x259bc0));
 canopy.scale.set(1,.38,.65);canopy.position.y=4.4;g.add(canopy);
 for(const x of [-2.5,2.5])for(const z of [-1.4,1.4]){
  const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(x,4.5,z),new T.Vector3(x*.08,1.5,z*.1)]),cordMaterial);g.add(line);
 }
 for(let i=0;i<4;i++){const stripe=new T.Mesh(new T.SphereGeometry(3.71,8,12,i*Math.PI/2,.16,0,Math.PI/2),material(0xffc062));stripe.scale.copy(canopy.scale);stripe.position.copy(canopy.position);g.add(stripe)}
 return g;
}
function updateDrop(dt){
 let mx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joy.x,mz=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+joy.y;
 const len=Math.hypot(mx,mz);if(len>1){mx/=len;mz/=len}
 const dx=(mx*Math.cos(yaw)+mz*Math.sin(yaw))*8*dt,dz=(-mx*Math.sin(yaw)+mz*Math.cos(yaw))*8*dt;
 moveSlide(player.position,dx,dz,solids);dropHeight=Math.max(0,dropHeight-4.2*dt);
 player.position.y=groundHeight(player.position.x,player.position.z)+dropHeight;
 player.rotation.y=yaw;animateAvatar(player,0,0);for(const arm of player.userData.arms)arm.rotation.x=2.65;player.userData.gun.visible=false;
 parachute.position.copy(player.position);parachute.rotation.y=yaw;parachute.rotation.z=Math.sin(performance.now()*.0015)*.025;
 scene.updateMatrixWorld(true);
 const desired=new T.Vector3(player.position.x+Math.sin(yaw)*10,player.position.y+5,player.position.z+Math.cos(yaw)*10);
 camera.position.lerp(desired,1-Math.exp(-dt*8));camera.lookAt(player.position.clone().add(new T.Vector3(-Math.sin(yaw)*5,0,-Math.cos(yaw)*5)));camera.fov=65;camera.updateProjectionMatrix();
 $('zone-text').textContent='กำลังร่อนลงเกาะ · สูง '+Math.ceil(dropHeight)+' ม.';drawMap();$('crosshair').style.opacity=0;
 if(dropHeight===0){scene.remove(parachute);parachute.traverse(o=>{if(o.isMesh||o.isLine)o.geometry.dispose()});parachute=null;player.userData.gun.visible=true;animateAvatar(player,0,0);$('crosshair').style.opacity=1;toast('ลงสนามแล้ว · เดินเข้าใกล้เพื่อเก็บของ');updateCamera(true)}
}

function jump(){if(state!=='playing'||dropHeight>0||jumpHeight>0||jumpVelocity>0)return;crouched=false;$('crouch-touch').classList.remove('active');jumpVelocity=7.3;tone(230,.06,'sine',.008)}
function crouch(){if(state!=='playing'||dropHeight>0||jumpHeight>0)return;crouched=!crouched;$('crouch-touch').classList.toggle('active',crouched)}
function toggleAim(){if(state!=='playing'||dropHeight>0)return;aiming=!aiming}
function removeBarrier(wall){scene.remove(wall.mesh);wall.mesh.traverse(o=>{if(o.isMesh)o.geometry.dispose()});for(const segment of wall.segments){const r=raySolids.indexOf(segment.mesh);if(r>=0)raySolids.splice(r,1);const s=solids.indexOf(segment.solid);if(s>=0)solids.splice(s,1);}barriers=barriers.filter(w=>w!==wall)}
function placeBarrier(){
 if(state!=='playing'||dropHeight>0)return;if(wallCharges<=0){toast('กำแพงหมด');return}if(wallCooldown>0)return;
 const quarter=Math.round(yaw/(Math.PI/2))*Math.PI/2,cx=player.position.x-Math.sin(quarter)*3.7,cz=player.position.z-Math.cos(quarter)*3.7;
 if(!canStand(cx,cz,solids,1.2)||Math.hypot(cx,cz)>98){toast('พื้นที่นี้วางกำแพงไม่ได้');return}
 const coordinates=[];
 for(let i=-2;i<=2;i++){const localX=i*.92,localZ=Math.abs(i)*.15,x=cx+localX*Math.cos(quarter)+localZ*Math.sin(quarter),z=cz-localX*Math.sin(quarter)+localZ*Math.cos(quarter),w=Math.abs(Math.cos(quarter))*.5+Math.abs(Math.sin(quarter))*.225,d=Math.abs(Math.cos(quarter))*.225+Math.abs(Math.sin(quarter))*.5;
  if(solids.some(s=>Math.abs(x-s.x)<s.w+w+.05&&Math.abs(z-s.z)<s.d+d+.05)||Math.hypot(x,z)>101){toast('พื้นที่นี้วางกำแพงไม่ได้');return}coordinates.push({x,z,w,d,height:2.65});
 }
 const g=new T.Group(),segments=[],base=groundHeight(cx,cz);g.position.set(cx,base,cz);g.rotation.y=quarter;scene.add(g);
 const wall={mesh:g,segments,health:220,remaining:25};barriers.push(wall);
 for(let i=-2;i<=2;i++){
  const localX=i*.92,localZ=Math.abs(i)*.15,mesh=box(g,1,2.65,.45,0xaddced,localX,1.325,localZ);mesh.userData.barrier=wall;
  box(g,.055,2.3,.025,0xeffcff,localX,1.3,localZ-.245);
  const x=cx+localX*Math.cos(quarter)+localZ*Math.sin(quarter),z=cz-localX*Math.sin(quarter)+localZ*Math.cos(quarter);
  const solid=coordinates[i+2];
  solids.push(solid);raySolids.push(mesh);segments.push({mesh,solid});
 }
 wallCharges--;wallCooldown=.65;scene.updateMatrixWorld(true);updateHud();toast('กำแพงป้องกัน · อยู่ได้ 25 วินาที');tone(330,.2,'sine',.025);
}
function flashMuzzle(position){const mesh=new T.Mesh(new T.SphereGeometry(.12,5,4),new T.MeshBasicMaterial({color:0xffe3a0}));mesh.position.copy(position);scene.add(mesh);effects.push({mesh,left:.045,total:.045,disposeMaterial:true})}
function damageNumber(position,damage,head){const element=document.createElement('div');element.className='damage-number'+(head?' critical':'');element.textContent=damage;document.body.append(element);labels.push({element,position:position.clone(),left:.8})}
function lockMouse(){if(touch||document.pointerLockElement)return;try{const promise=$('game').requestPointerLock?.();promise?.catch?.(()=>{})}catch{}}
function bindControls(){
 $('start').onclick=()=>{startMatch();lockMouse()};$('replay').onclick=()=>{startMatch();lockMouse()};$('home').onclick=showLobby;$('quit').onclick=showLobby;
 $('pause').onclick=()=>pauseGame(true);$('resume').onclick=()=>{pauseGame(false);lockMouse()};
 $('sound').onclick=()=>{muted=!muted;$('sound').textContent='เสียง: '+(muted?'ปิด':'เปิด');unlockAudio()};
 $('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>toast('เบราว์เซอร์นี้ไม่รองรับเต็มหน้าจอ'));else toast('เบราว์เซอร์นี้ไม่รองรับเต็มหน้าจอ')};
 for(let i=0;i<3;i++)$('slot-'+i).onclick=()=>swap(i);
 addEventListener('keydown',e=>{
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(e.code))e.preventDefault();
  if(e.code==='Escape'){pauseGame(state==='playing');return}if(state!=='playing')return;keys.add(e.code);if(e.repeat)return;
  if(e.code==='KeyR')reload();if(e.code==='KeyQ')heal();if(e.code==='KeyE')swap();if(e.code==='KeyC')crouch();if(e.code==='Space')jump();if(e.code==='KeyG')placeBarrier();if(e.code.startsWith('Digit'))swap(Number(e.code.slice(-1))-1);
 });addEventListener('keyup',e=>keys.delete(e.code));
 addEventListener('blur',()=>{if(state==='playing')pauseGame(true)});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pauseGame(true)});
 $('game').addEventListener('contextmenu',e=>e.preventDefault());
 $('game').addEventListener('pointerdown',e=>{
  if(state!=='playing'||e.pointerType==='touch')return;unlockAudio();lockMouse();
  if(e.button===0){fire=true;shootingPointer=e.pointerId;shoot()}if(e.button===2)aiming=true;
  if(!document.pointerLockElement){lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};capturePointer($('game'),e.pointerId)}
 });
 addEventListener('pointermove',e=>{
  if(state!=='playing')return;const sensitivity=aiming?.62:1;
  if(document.pointerLockElement){yaw-=e.movementX*.003*sensitivity;pitch=clamp(pitch-e.movementY*.002*sensitivity,-.6,.6)}
  else if(lookPointer?.id===e.pointerId){const dx=e.clientX-lookPointer.x,dy=e.clientY-lookPointer.y;yaw-=dx*.006*sensitivity;pitch=clamp(pitch-dy*.004*sensitivity,-.6,.6);lookPointer.x=e.clientX;lookPointer.y=e.clientY}
 });
 function stopPointer(e){if(lookPointer?.id===e.pointerId)lookPointer=null;if(shootingPointer===e.pointerId){fire=false;shootingPointer=null}if(e.pointerType!=='touch'&&e.button===2)aiming=false;if(joyPointer===e.pointerId){joyPointer=null;joy={x:0,y:0};$('stick').style.transform=''}}
 addEventListener('pointerup',stopPointer);addEventListener('pointercancel',stopPointer);document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement){fire=false;aiming=false}});
 $('look-area').addEventListener('pointerdown',e=>{if(state!=='playing')return;lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};capturePointer(e.currentTarget,e.pointerId);unlockAudio()});
 const joystick=$('joystick');function joystickMove(e){const r=joystick.getBoundingClientRect(),max=r.width*.34,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,d=Math.hypot(dx,dy),scale=d>max?max/d:1;joy.x=dx*scale/max;joy.y=dy*scale/max;$('stick').style.transform='translate('+dx*scale+'px,'+dy*scale+'px)'}
 joystick.addEventListener('pointerdown',e=>{if(state!=='playing')return;joyPointer=e.pointerId;capturePointer(joystick,e.pointerId);joystickMove(e);e.preventDefault()});joystick.addEventListener('pointermove',e=>{if(joyPointer===e.pointerId)joystickMove(e)});
 const f=$('fire-touch');f.addEventListener('pointerdown',e=>{if(state!=='playing')return;fire=true;shootingPointer=e.pointerId;lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};shoot();capturePointer(f,e.pointerId);unlockAudio();e.preventDefault()});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])f.addEventListener(event,()=>{fire=false;shootingPointer=null});
 $('reload-touch').onclick=reload;$('heal-touch').onclick=heal;$('swap-touch').onclick=()=>swap();$('jump-touch').onclick=jump;$('crouch-touch').onclick=crouch;$('aim-touch').onclick=toggleAim;$('wall-touch').onclick=placeBarrier;
 const s=$('sprint-touch');s.addEventListener('pointerdown',e=>{sprint=true;crouched=false;$('crouch-touch').classList.remove('active');capturePointer(s,e.pointerId)});for(const event of ['pointerup','pointercancel','lostpointercapture'])s.addEventListener(event,()=>sprint=false);
}
function registerTools(){const context=document.modelContext;if(!context?.registerTool)return;const controller=new AbortController();addEventListener('pagehide',()=>controller.abort(),{once:true});
const noInput=input=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Expected an empty object');};
const toolList=[
{name:'read_match_state',title:'อ่านสถานะเกม',description:'Read the current local match state without changing the game.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:input=>{noInput(input);return getMatchState()}},
{name:'start_match',title:'เริ่มเกมใหม่',description:'Start a new solo match against 11 bots, replacing the current local match. This is the same action as the Play button.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{noInput(input);return startMatch()}},
{name:'set_match_paused',title:'พักหรือเล่นต่อ',description:'Pause or resume the current solo match. Only works on an active or paused match.',inputSchema:{type:'object',properties:{paused:{type:'boolean'}},required:['paused'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!input||typeof input.paused!=='boolean'||Object.keys(input).some(k=>k!=='paused'))throw new Error('paused must be a boolean');if(!['playing','paused'].includes(state))throw new Error('No active match');return pauseGame(input.paused)}}
,
{name:'perform_player_action',title:'ควบคุมตัวละคร',description:'Perform a gameplay action in the current solo match using the same controls as the visible buttons. This changes only the local game.',inputSchema:{type:'object',properties:{action:{type:'string',enum:['jump','crouch','aim','place_barrier','reload','heal','cycle_weapon']}},required:['action'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{const actions={jump,crouch,aim:toggleAim,place_barrier:placeBarrier,reload,heal,cycle_weapon:swap};if(!input||typeof input.action!=='string'||Object.keys(input).some(k=>k!=='action')||!Object.hasOwn(actions,input.action))throw new Error('Invalid action');if(state!=='playing')throw new Error('Match must be active');actions[input.action]();updateHud();return getMatchState()}}
];for(const t of toolList)try{Promise.resolve(context.registerTool(t,{signal:controller.signal})).catch(()=>{})}catch{}}
try{
renderer=new T.WebGLRenderer({canvas:$('game'),antialias:!touch,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,touch?1.25:1.5));renderer.shadowMap.enabled=!touch;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;scene=new T.Scene();makeWorld(scene);camera=new T.PerspectiveCamera(60,innerWidth/innerHeight,.12,1200);player=makeAvatar();player.position.set(0,0,24);scene.add(player);
zoneGroup=new T.Group();zoneGroup.visible=false;scene.add(zoneGroup);zoneWall=new T.Mesh(new T.CylinderGeometry(1,1,15,96,1,true),new T.MeshBasicMaterial({color:0x73dce5,transparent:true,opacity:.13,side:T.DoubleSide,depthWrite:false}));zoneWall.position.y=7.5;zoneGroup.add(zoneWall);zoneRing=new T.Mesh(new T.TorusGeometry(1,.008,4,96),new T.MeshBasicMaterial({color:0x8ceef0}));zoneRing.rotation.x=Math.PI/2;zoneRing.position.y=.08;zoneGroup.add(zoneRing);
function resize(){touch=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0||innerWidth<=900;document.body.classList.toggle('touch',touch);renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();bindControls();registerTools();$('loading').hidden=true;$('start').disabled=false;$('start').textContent='ลงสนาม';
let prev=performance.now()/1000;function frame(ms){const t=ms/1000,dt=Math.min(Math.max(t-prev,.001),.05);prev=t;if(state==='lobby'){camera.position.set(15+Math.sin(t*.08)*3,9,39);camera.lookAt(-3,2,17);player.rotation.y=-.5}else if(state==='playing')update(dt);renderer.render(scene,camera);requestAnimationFrame(frame)}requestAnimationFrame(frame);
}catch(error){$('loading').hidden=false;$('loading').textContent='เปิด 3D ไม่สำเร็จ ลองใช้ Chrome หรือ Safari ที่อัปเดตแล้ว';$('start').textContent='โหลดใหม่';$('start').disabled=false;$('start').onclick=()=>location.reload();console.error(error);}



