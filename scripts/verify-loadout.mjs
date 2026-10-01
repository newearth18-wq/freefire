import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import * as T from '../public/vendor/three.module.js';
import {GLTFLoader} from '../public/vendor/addons/loaders/GLTFLoader.js';
import {prepareCharacter,makeAvatar,animateAvatar,disposeAvatar} from '../public/visuals.mjs';
import {CHARACTERS,characterDefault,normalizeAppearance} from '../public/appearance.mjs';
import {inviteLink,readInvitation} from '../public/invitations.mjs';
import {makeMatch,view} from '../public/engine.mjs';
const base='https://last-island.example/',code='ABCD29',link=inviteLink(code,base+'?old=1#fragment');
assert.equal(link,base+'?room='+code);assert.equal(readInvitation(link,base),code);assert.equal(readInvitation(' abcd29 ',base),code);
for(const text of['javascript:alert(1)','https://other.example/?room=ABCD29','https://last-island.example.evil/?room=ABCD29',base+'?room=ABCD29&token=secret',base+'?room=ABCD29&room=ZZZZ22',base+'other?room=ABCD29',base+'?room=BAD',base+'?room=ABCD29#evil'])assert.throws(()=>readInvitation(text,base));
// Round-trip actual QR modules through the independent image decoder, rotated and inverted.
const qr=QRCode.create(link,{errorCorrectionLevel:'M'}),scale=6,margin=4,size=(qr.modules.size+margin*2)*scale;
for(const inverted of[false,true])for(const rotated of[false,true]){const pixels=new Uint8ClampedArray(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const row=Math.floor(y/scale)-margin,col=Math.floor(x/scale)-margin,dark=row>=0&&col>=0&&row<qr.modules.size&&col<qr.modules.size&&qr.modules.get(row,col);let xx=rotated?size-y-1:x,yy=rotated?x:y;const offset=(yy*size+xx)*4,value=!!dark!==inverted?0:255;pixels.set([value,value,value,255],offset)}const result=jsQR(pixels,size,size,{inversionAttempts:'attemptBoth'});assert.ok(result,'a valid QR is recognized');assert.equal(readInvitation(result.data,base),code)}
for(const c of CHARACTERS){const bytes=await readFile(new URL('../public/models/'+c.model+'.glb',import.meta.url));prepareCharacter(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),c.model)}
const point=new T.Vector3();let combinations=0;
for(const c of CHARACTERS)for(let upper=0;upper<3;upper++)for(let lower=0;lower<3;lower++)for(let feet=0;feet<3;feet++){
 const avatar=makeAvatar(0,{...characterDefault(c.id),upper,lower,feet,backpack:false});let body;avatar.userData.model.traverse(o=>{if(o.isSkinnedMesh){assert.equal(body,undefined,'one merged body per actor');body=o}});
 for(const speed of[0,5.4]){animateAvatar(avatar,{status:'alive',speed,crouch:false},.5);avatar.updateMatrixWorld(true);for(let i=0;i<body.geometry.attributes.position.count;i+=47){body.getVertexPosition(i,point);assert.ok(Number.isFinite(point.x)&&Math.abs(point.x)<1.5&&point.y>-.3&&point.y<2.7&&Math.abs(point.z)<1.5,'modular outfits retain metre scale and valid animated skinning')}}disposeAvatar(avatar);combinations++;
}
const look=normalizeAppearance({...characterDefault('nova'),hair:3,backpack:false}),match=makeMatch({humans:[{id:'you',name:'Test',appearance:look}]});assert.deepEqual(view(match,'you').appearance,look,'solo uses the selected appearance');
console.log(`Loadout tests passed: ${combinations} animated clothing combinations, solo appearance, QR image decoding/rotation/inversion and safe invitation parsing`);
