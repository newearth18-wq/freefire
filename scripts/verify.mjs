import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {zoneAt,canStand,moveSlide,applyDamage,reloadWeapon,WEAPONS} from '../dist/rules.mjs';
const samples=[0,39,40,60,80,110,145,175,205,230,260,300];let last=Infinity;for(const t of samples){const z=zoneAt(t);assert(z.radius>=0&&z.radius<=last,'safe zone must shrink monotonically');last=z.radius}assert.equal(zoneAt(0).radius,108);assert.equal(zoneAt(260).radius,0);assert.equal(zoneAt(60).radius,89);
const cover=[{x:0,z:0,w:2,d:2}];assert(!canStand(0,0,cover));assert(canStand(4,0,cover));assert(!canStand(104,0,[]));const p={x:3,z:0};moveSlide(p,-2,1,cover);assert.equal(p.x,3);assert.equal(p.z,1);assert.equal(applyDamage(20,50),0);assert.equal(applyDamage(20,-10),20);const w={spec:WEAPONS[0],ammo:2,reserve:7};assert.equal(reloadWeapon(w),7);assert.equal(w.ammo,9);assert.equal(w.reserve,0);
const html=await readFile('dist/index.html','utf8');const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'IDs must be unique');const js=await readFile('dist/game.mjs','utf8');for(const m of js.matchAll(/\$\('([^']+)'\)/g))assert(ids.includes(m[1]),'missing UI element '+m[1]);for(const filename of['game.mjs','style.css','world.mjs','rules.mjs','vendor/three.module.js','vendor/three.core.js','vendor/LICENSE'])await readFile('dist/'+filename);
console.log('PASS: zone phases, damage, ammunition, collision sliding, UI wiring, and local assets');

