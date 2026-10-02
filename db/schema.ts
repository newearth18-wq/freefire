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
export const learnerProfiles=sqliteTable('learner_profiles',{
 token:text('token').primaryKey(),appearance:text('appearance').notNull().default('{}'),created:integer('created').notNull(),
});
export const learningRewards=sqliteTable('learning_rewards',{
 profileToken:text('profile_token').notNull(),matchId:text('match_id').notNull(),questionId:text('question_id').notNull(),stars:integer('stars').notNull(),
},t=>[primaryKey({columns:[t.profileToken,t.matchId,t.questionId]})]);
export const teacherAccounts=sqliteTable('teacher_accounts',{
 id:text('id').primaryKey(),created:integer('created').notNull(),
});
export const teacherQuestionSets=sqliteTable('teacher_question_sets',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull().references(()=>teacherAccounts.id),
 title:text('title').notNull(),mapId:text('map_id').notNull(),lesson:text('lesson').notNull(),questionCount:integer('question_count').notNull(),
 revision:integer('revision').notNull().default(0),created:integer('created').notNull(),updated:integer('updated').notNull(),
},t=>[index('teacher_sets_owner_updated').on(t.ownerId,t.updated)]);
