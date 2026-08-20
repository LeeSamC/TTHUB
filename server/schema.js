const { unique } = require('drizzle-orm/gel-core');
const { 
    pgTable, 
    uuid, 
    varchar, 
    timestamp, 
    boolean, 
    text,
    integer,
    primaryKey,
    pgEnum
} = require('drizzle-orm/pg-core');



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

const posts = pgTable('post', {
    postId: uuid('post_id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.userId, {
        onDelete: 'cascade'
    }),
    content: text('content'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at')
})



const mediaTypeEnum = pgEnum('media_type', [
    'image',
    'video'
])

const media = pgTable('media', {
    mediaId: uuid('media_id').defaultRandom().primaryKey(),
    uploadedBy: uuid('uploaded_by').notNull().references(() => users.userId, {
        onDelete: 'cascade'
    }),
    type: mediaTypeEnum('type').notNull(),
    storageKey: varchar('storage_key', {length: 500}).notNull(),
    mimeType: varchar('mime_type', {length: 100}).notNull(),
    width: integer('width'),
    height: integer('height'),
    duration: integer('duration'),
    createdAt: timestamp('created_at').defaultNow().notNull()
})

const postMedia = pgTable('post_media', {
    postId: uuid('post_id').notNull().references(() => posts.postId, {
        onDelete: 'cascade'
    }),
    mediaId: uuid('media_id').notNull().references(() => media.mediaId, {
        onDelete: 'cascade'
    }),
    sortOrder: integer('sort_order').notNull().default(0),
},
(table) => ({
    pk: primaryKey({
        columns: [
            table.postId,
            table.mediaId
        ]
    })
})

)

const likes = pgTable('likes', {
    likeId: uuid('like_id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.userId, {onDelete: 'cascade'}),
    postId: uuid('post_id').notNull().references(() => posts.postId, {onDelete: 'cascade'}),
    createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
    uniqueUserPostLike :unique().on(
        table.postId,
        table.userId
    )
}))

const comments = pgTable('comments', {
    commentId: uuid('comment_id').defaultRandom().primaryKey(),
    postId: uuid('post_id').notNull().references(() => posts.postId, {onDelete: 'cascade'}),
    userId: uuid('user_id').notNull().references(() => users.userId, {onDelete: 'cascade'}),
    parentCommentId: uuid('parent_comment_id').references(() => comments.commentId, {onDelete: 'cascade'}),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at')
})


module.exports = {users, refreshTokens, posts, media, mediaTypeEnum, postMedia, likes, comments};