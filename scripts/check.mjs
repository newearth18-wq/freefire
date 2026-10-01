import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
for(const directory of ['public','server','scripts'])for(const name of await readdir(directory)){if(!name.endsWith('.mjs'))continue;const r=spawnSync(process.execPath,['--check',directory+'/'+name],{encoding:'utf8'});if(r.status){process.stderr.write(r.stderr);process.exit(r.status)}}
console.log('JavaScript syntax checks passed');
