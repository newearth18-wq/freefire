import {sqliteTable,text,integer,index,uniqueIndex,primaryKey} from 'drizzle-orm/sqlite-core';
export const rooms=sqliteTable('rooms',{
 code:text('code').primaryKey(),
 data:text('data').notNull(),
 revision:integer('revision').notNull().default(0),
 expires:integer('expires').notNull(),
 queueMode:text('queue_mode'),
},t=>[index('rooms_expires').on(t.expires),uniqueIndex('rooms_open_queue').on(t.queueMode)]);
export const roomInputs=sqliteTable('room_inputs',{
 code:text('code').notNull(),
 memberId:text('member_id').notNull(),
 data:text('data').notNull(),
 updated:integer('updated').notNull(),
 expires:integer('expires').notNull(),
},t=>[primaryKey({columns:[t.code,t.memberId]}),index('room_inputs_expires').on(t.expires)]);
