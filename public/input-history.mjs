// Keep the controls actually used by display frames while a poll is in flight.
// Server positions are replayed to the present using this history, not one old
// key sample stretched across the whole response delay.
export class InputHistory {
 constructor(){this.samples=[]}
 reset(){this.samples=[]}
 record(at,input){const sample={at,input:{...input,actions:(input.actions??[]).map(a=>({...a}))}};this.samples.push(sample);while(this.samples.length>240||this.samples.length>1&&this.samples[1].at<at-3000)this.samples.shift()}
 segments(from,to,fallback={}){const result=[];let at=from,input=fallback;for(const s of this.samples){if(s.at<=from){input=s.input;continue}if(s.at>=to)break;result.push({dt:(s.at-at)/1000,input});at=s.at;input=s.input}if(to>at)result.push({dt:(to-at)/1000,input});return result}
}

export function snapshotLocalTime(room,sentAt,receivedAt){
 const rtt=Math.max(0,receivedAt-sentAt);
 if(!Number.isFinite(room.serverNow)||!Number.isFinite(room.receivedAt)||!Number.isFinite(room.simulatedAt))return receivedAt-Math.min(750,rtt/2);
 const processing=Math.max(0,room.serverNow-room.receivedAt),network=Math.max(0,rtt-processing);
 return receivedAt-Math.max(0,room.serverNow-room.simulatedAt)-network/2;
}

export function newerMotion(previous,next){if(!previous?.match||previous.match.id!==next.match?.id)return true;if(Number.isInteger(next.snapshotRevision)&&next.snapshotRevision<=previous.snapshotRevision)return false;return !Number.isFinite(next.simulatedAt)||next.simulatedAt>previous.simulatedAt}

// Never keep walking speculatively beyond the server's catch-up budget. Hold
// the last presented position until fresh data arrives instead of resetting it
// backwards to the last packet on every subsequent display frame.
export function predictionFresh(age,ping=0){return age<=Math.max(1000,Math.min(1500,ping*2+300))}
