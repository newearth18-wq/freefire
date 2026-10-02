import assert from 'node:assert/strict';
import {makeMatch,setInput,tick,act,damage} from '../public/engine.mjs';
import {WEAPONS} from '../public/rules.mjs';
import {ownedWeapons,equippedScope,scopeFov,shotSpread,aimAssistDelta,rangeDamage} from '../public/combat.mjs';
import {lineClear} from '../public/arena.mjs';
function arena(index=0){const m=makeMatch({humans:[{id:'a'},{id:'b'}]});m.drop=0;m.loot=[];m.entities=m.entities.slice(0,2);const[a,b]=m.entities;Object.assign(a,{x:0,z:0,y:0,yaw:0,pitch:0,weapon:index});a.weapons.forEach((w,i)=>w.owned=i===index);Object.assign(b,{x:0,z:-20,y:0,hp:10000,armor:0});return{m,a,b}}
for(let index=0;index<WEAPONS.length;index++){
 const spec=WEAPONS[index],{m,a}=arena(index),before=a.weapons[index].ammo;
 for(let n=0;n<20;n++){setInput(m,a.id,{fire:true,yaw:0,pitch:0});tick(m,.04)}
 const used=before-a.weapons[index].ammo;assert.ok(spec.auto?used>1:used===1,spec.name+' respects automatic / single trigger mode');
 setInput(m,a.id,{fire:false});for(let n=0;n<40;n++)tick(m,.04);
 const after=a.weapons[index].ammo;setInput(m,a.id,{fire:true});tick(m,.04);assert.equal(a.weapons[index].ammo,after-1,'release permits a new shot');
 a.weapons[index].ammo=0;a.weapons[index].reserve=3;a.reload=0;act(m,a,'reload');
 setInput(m,a.id,{fire:false});for(let n=0;n<100;n++)tick(m,.04);
 assert.equal(a.weapons[index].ammo,Math.min(spec.mag,3));assert.equal(a.weapons[index].reserve,3-Math.min(spec.mag,3));
 assert.ok(rangeDamage(spec,spec.range)<rangeDamage(spec,1));
}
const scoped=arena(9);scoped.a.aim=scoped.a.scoped=true;scoped.a.pitch=Math.atan2(1.4-1.65,19.88);const health=scoped.b.hp;act(scoped.m,scoped.a,'fire');assert.ok(scoped.b.hp<health,'scope center resolves to a damaging muzzle ray');
scoped.a.shot=0;scoped.a.recoil=0;scoped.m.walls=[{id:77,hp:250,life:30,parts:[{x:0,z:-7,w:2,d:.3,y:0,h:3}]}];const protectedHp=scoped.b.hp;act(scoped.m,scoped.a,'fire');assert.equal(scoped.b.hp,protectedHp,'scoped shots cannot pass through cover');assert.ok(scoped.m.walls[0].hp<250);
assert.equal(equippedScope(scoped.a),8);assert.ok(scopeFov(8)<scopeFov(4)&&scopeFov(4)<scopeFov(2));assert.ok(Math.abs(Math.tan(scopeFov(4)*Math.PI/360)*4-Math.tan(Math.PI/6))<1e-9);
const inventory=arena();inventory.m.loot=[{id:1,x:0,y:0,z:0,type:'weapon',weapon:9}];tick(inventory.m,.04);assert.equal(inventory.a.weapon,0,'walking over guns never changes the loadout');act(inventory.m,inventory.a,'pickup');assert.equal(inventory.a.weapon,9);assert.ok(ownedWeapons(inventory.a).includes(9));
inventory.a.weapons[1].owned=true;inventory.m.loot=[{id:2,x:0,y:0,z:0,type:'weapon',weapon:8}];act(inventory.m,inventory.a,'pickup');assert.equal(ownedWeapons(inventory.a).length,3);assert.equal(inventory.a.weapons[9].owned,false);assert.ok(inventory.m.loot.some(l=>l.weapon===9),'full loadouts drop the replaced weapon');
inventory.a.weapon=0;inventory.a.scope=1;act(inventory.m,inventory.a,'scope');assert.equal(equippedScope(inventory.a),0,'uncollected magnifications cannot be selected');inventory.m.loot=[{id:3,x:0,y:0,z:0,type:'scope',scope:4}];tick(inventory.m,.04);assert.ok(inventory.a.scopes.includes(4));act(inventory.m,inventory.a,'scope');assert.equal(equippedScope(inventory.a),1);act(inventory.m,inventory.a,'scope');assert.equal(equippedScope(inventory.a),4);
const recoil=arena();act(recoil.m,recoil.a,'fire');assert.ok(recoil.a.recoil>0);const kick=recoil.a.recoil;tick(recoil.m,.04);assert.ok(recoil.a.recoil<kick);assert.ok(shotSpread({...recoil.a,jump:1,speed:8})>shotSpread({...recoil.a,aim:true,crouch:true,jump:0,speed:0}));
const assist=arena();assist.b.x=.4;assist.a.scoped=true;const pull=aimAssistDelta(assist.m,assist.a,0,0,[],lineClear,.016);assert.ok(pull&&pull.yaw<0);assert.equal(aimAssistDelta(assist.m,assist.a,0,0,[{x:0,z:-8,w:3,d:.3,y:0,h:3}],lineClear,.016),null,'assist ignores obscured targets');assist.b.team=assist.a.team;assert.equal(aimAssistDelta(assist.m,assist.a,0,0,[],lineClear,.016),null,'assist never follows teammates');
const normal=arena(),piercing=arena();normal.b.armor=piercing.b.armor=100;damage(normal.m,normal.b,40,normal.a);damage(piercing.m,piercing.b,40,piercing.a,false,.35);assert.ok(piercing.b.hp<normal.b.hp,'penetration reduces armor absorption');
console.log('Combat passed: 12 weapons, firing modes, reload accounting, scoped hits/cover, optical zoom, inventory, recoil, bloom, assist occlusion and penetration');
