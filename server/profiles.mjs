import {COSMETICS} from '../public/session-features.mjs';
import {normalizeAppearance} from '../public/appearance.mjs';
const tokenValid=t=>typeof t==='string'&&/^[a-f0-9]{64}$/.test(t);
export async function getProfile(db,token){if(!tokenValid(token))return null;const row=await db.prepare('SELECT token,appearance FROM learner_profiles WHERE token=?').bind(token).first();if(!row)return null;const value=await db.prepare('SELECT COALESCE(SUM(stars),0) AS stars FROM learning_rewards WHERE profile_token=?').bind(token).first();return{token:row.token,stars:Number(value?.stars??0),appearance:JSON.parse(row.appearance)}}
export async function awardProfile(db,room,member){if(!member.profileToken||!room.match)return;const e=room.match.entities.find(e=>e.id===member.id),earned=(e?.learning?.completed??[]).filter(a=>a.earned);if(!earned.length)return;await db.batch(earned.map(a=>db.prepare('INSERT OR IGNORE INTO learning_rewards (profile_token,match_id,question_id,stars) VALUES (?,?,?,2)').bind(member.profileToken,room.match.id,a.id)))}
export async function profileRequest(db,input){
 if(!input.profileToken){const token=(crypto.randomUUID()+crypto.randomUUID()).replaceAll('-','');await db.prepare('INSERT INTO learner_profiles (token,appearance,created) VALUES (?, ?, ?)').bind(token,'{}',Date.now()).run();return{token,stars:0,appearance:{}}}
 let profile=await getProfile(db,input.profileToken);if(!profile)throw Object.assign(Error('ไม่พบโปรไฟล์การเรียน'),{status:401});
 if(input.appearance){await validateCosmetic(db,input);profile.appearance=normalizeAppearance(input.appearance);await db.prepare('UPDATE learner_profiles SET appearance=? WHERE token=?').bind(JSON.stringify(profile.appearance),input.profileToken).run()}
 if(input.code&&input.token){
  const row=await db.prepare('SELECT data,revision FROM rooms WHERE code=?').bind(input.code).first(),room=row?JSON.parse(row.data):null,member=room?.members.find(m=>m.token===input.token&&(!m.profileToken||m.profileToken===input.profileToken));
  if(member){
   // Upgrade existing room sessions without replacing a concurrently advanced room.
   if(!member.profileToken){member.profileToken=input.profileToken;await db.prepare('UPDATE rooms SET data=?,revision=revision+1 WHERE code=? AND revision=?').bind(JSON.stringify(room),input.code,row.revision).run()}
   await awardProfile(db,room,member);profile=await getProfile(db,input.profileToken)
  }
 }
 return profile;
}
export async function validateCosmetic(db,input){const profile=input.profileToken?await getProfile(db,input.profileToken):null;if(input.profileToken&&!profile)throw Object.assign(Error('โปรไฟล์การเรียนไม่ถูกต้อง'),{status:401});const reward=COSMETICS.find(c=>c.id===input.appearance?.cosmetic);if(reward?.stars>(profile?.stars??0))throw Object.assign(Error('ดาวยังไม่พอปลดของแต่งตัวนี้'),{status:403});return profile}
