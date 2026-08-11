const { pgTable, uuid, varchar, timestamp, boolean } = require('drizzle-orm/pg-core')

const users = pgTable('users', {
    userId: uuid('user_id').defaultRandom().primaryKey(),
    firstName: varchar('first_name', { length: 255 }).notNull(),
    lastName: varchar('last_name', { length: 255 }).notNull(),
    username: varchar('username', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

const refreshTokens = pgTable('refresh_tokens', {
    id: uuid('id').defaultRandom().primaryKey(),
    token: varchar('token', {length: 500}).notNull().unique(),
    userId: uuid('user_id').references(() => users.userId, { onDelete: 'cascade'}).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    revoked: boolean('revoked').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()

})

module.exports = {users, refreshTokens};