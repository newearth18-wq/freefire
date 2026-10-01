import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
export async function localDatabase(filename=':memory:'){
 const database=new DatabaseSync(filename);database.exec('PRAGMA journal_mode=WAL');database.exec('CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY)');
 for(const name of(await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort()){if(database.prepare('SELECT name FROM _local_migrations WHERE name=?').get(name))continue;database.exec(await readFile('drizzle/'+name,'utf8'));database.prepare('INSERT INTO _local_migrations (name) VALUES (?)').run(name)}
 return{prepare(sql){const statement=database.prepare(sql);return{bind(...args){return{async first(){return statement.get(...args)??null},async run(){const r=statement.run(...args);return{meta:{changes:Number(r.changes)}}},async all(){return{results:statement.all(...args)}}}}}},close:()=>database.close()};
}
