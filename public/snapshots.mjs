// Loot never moves after spawning. A changed ID list requests a fresh full list.
export const lootStamp=match=>match?match.id+':'+match.loot.map(item=>item.id).join(','):null;
export function mergeRoomSnapshot(previous,next){
 if(!previous||previous.code!==next.code)return next;
 if(Number.isInteger(next.snapshotRevision)&&Number.isInteger(previous.snapshotRevision)&&next.snapshotRevision<previous.snapshotRevision)return{...next,...previous,...(next.answerResult?{answerResult:next.answerResult}:{})};
 const merged={...previous,...next};
 if(next.match)merged.match={...next.match,loot:next.match.loot??(previous.match?.id===next.match.id?previous.match.loot:[])};
 return merged;
}
