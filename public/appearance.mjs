// Appearance is shared by the lobby, simulation and room server.
export const CHARACTERS=[
 {id:'ranger',name:'อาร์ค',tag:'RANGER',model:'operative',description:'นักสำรวจเกาะ · ชุดภาคสนาม'},
 {id:'nova',name:'โนวา',tag:'NOVA',model:'nova',description:'นักวิ่งอิสระ · สตรีทแวร์'},
 {id:'ghost',name:'โกสต์',tag:'GHOST',model:'ghost',description:'หน่วยลาดตระเวน · ชุดฮู้ด'}
];
export const SWATCHES=[
 {id:'teal',name:'ฟ้าเทอร์ควอยซ์',hex:0x237b86},
 {id:'olive',name:'เขียวทหาร',hex:0x62713c},
 {id:'red',name:'แดงอิฐ',hex:0xa63c3e},
 {id:'violet',name:'ม่วง',hex:0x7152a9},
 {id:'gold',name:'ทอง',hex:0xc48c2b},
 {id:'black',name:'ดำ',hex:0x202a34}
];
export const HAIR=[{name:'ดำ',hex:0x241c1a},{name:'น้ำตาล',hex:0x624330},{name:'บลอนด์',hex:0xbf9857},{name:'เงิน',hex:0xb7c6d0}];
export const SKIN=[{name:'โทน 1',hex:0xe1ad88},{name:'โทน 2',hex:0xc48961},{name:'โทน 3',hex:0x966044},{name:'โทน 4',hex:0x67432e}];
export const OUTFITS=[{name:'ภาคสนาม',model:'operative'},{name:'สตรีท',model:'nova'},{name:'ลาดตระเวน',model:'ghost'}];
export const DEFAULT_APPEARANCE=Object.freeze({character:'ranger',upper:0,lower:0,feet:0,upperColor:0,lowerColor:5,feetColor:5,hair:0,skin:1,backpack:true});
const choice=(value,size,fallback)=>Number.isInteger(value)&&value>=0&&value<size?value:fallback;
export function normalizeAppearance(value){const a=value&&typeof value==='object'&&!Array.isArray(value)?value:{};return{
 character:CHARACTERS.some(c=>c.id===a.character)?a.character:DEFAULT_APPEARANCE.character,
 upper:choice(a.upper,3,0),lower:choice(a.lower,3,0),feet:choice(a.feet,3,0),
 upperColor:choice(a.upperColor,6,0),lowerColor:choice(a.lowerColor,6,5),feetColor:choice(a.feetColor,6,5),
 hair:choice(a.hair,4,0),skin:choice(a.skin,4,1),backpack:typeof a.backpack==='boolean'?a.backpack:true
}}
export function appearanceKey(value){return JSON.stringify(normalizeAppearance(value))}
export function characterInfo(value){return CHARACTERS.find(c=>c.id===normalizeAppearance(value).character)}
export function characterDefault(id){const index=CHARACTERS.findIndex(c=>c.id===id);return normalizeAppearance({...DEFAULT_APPEARANCE,character:id,upper:Math.max(0,index),lower:Math.max(0,index),feet:Math.max(0,index),upperColor:[0,3,5][Math.max(0,index)]})}
export function botAppearance(team,slot=0){return normalizeAppearance({...characterDefault(CHARACTERS[(team+slot)%3].id),upperColor:team%4,lowerColor:5,backpack:slot%2===0})}
