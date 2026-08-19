//Web Framework used to create the HTTP and define routes
const express = require('express')

//Adds various HTTP security headers to responses to protect the application against common web vulnerabilities
const helmet = require('helmet')

//Prevents users from making too many request (Helps with brute froce attacks)
const rateLimit = require('express-rate-limit')

//Controls which frontend applications are allowed to communicate with the backend
const cors = require('cors')

//Reads cookies sent by the broswer and makes them available through req.cookies
const cookieParser = require('cookie-parser')

//Used to securely hash passwords and compare plaintext passwords against hased ones
const bcrypt = require('bcryptjs')

//Used to create and verify JWT access/refresh tokens
const jwt = require('jsonwebtoken')

//Validate incoming request data
const {z} = require('zod')

//Handle mulitpart/form data for media 
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')            


const {eq, and, isNull, desc, inArray, sql} = require('drizzle-orm')
const {db} = require('./db')
const {users, refreshTokens, posts, media, postMedia, likes} = require('./schema');
const { 
  number
} = require('drizzle-orm/pg-core');
const { resourceLimits } = require('worker_threads')

const app = express();

const PORT = 3000

// ==============================================
// GLOBAL MIDDLEWARE
// ==============================================

//Adds security related headers
app.use(helmet({
    crossOriginResourcePolicy: {
        policy: 'cross-origin'
    }
}))

//Reads cookies from incoming requests
app.use(cookieParser())

// Allows expressto automatically parse json bodies
app.use(express.json())



// ==============================================
// CORS CONFIGURATION
// ==============================================

//Controls which frontend is allowed to make cross-origin request to this backend
app.use(cors({
    origin: 'http://localhost:5173',

    //Allows the browser to send cookies with request 
    credentials: true
}))



// ==============================================
// RATE LIMITING
// ==============================================

//Creates a rate limiter specifically for authentication routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {error: 'Too many authenication attempts. Please try again after 15 minutes'},
    standardHeaders: true,
    legacyHeaders: false
})

app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)


// ==============================================
// COOKIE CONFIGURATIONS
// ==============================================

const ACCESS_COOKIE_OPTIONS = {
    //Javascript running in the browser cannot access this cookie
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',

    //Control when broswers send cookies - lax = Default
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,

    path: '/'
}

const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    //This cookie will only be sent to URL under /api/auth
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000 
}

// =========================================
// TOKEN CREATION FUNCTION
// =========================================


async function issueTokens(userId, res) {

    const accessToken = jwt.sign({userId}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '15m'});

    const refreshToken = jwt.sign({userId}, process.env.REFRESH_TOKEN_SECRET, {expiresIn: '7d'})

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({
        token: refreshToken,
        userId: userId,
        expiresAt: expiresAt
    });

    res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
}

// ============================================================
// REQUEST VALIDATION SCHEMAS
// ============================================================


const registerSchema = z.object({
    firstName: z.string().min(1, "First Name is required"),
    lastName: z.string().min(1, "Last Name is required"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
})

const loginSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required")
})

const userUpdateSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    username: z.string().min(3, "Username must be at least 3 charachers"),
})



const createPostSchema = z.object({
    content: z.string().trim().min(1, 'Post content cannot be empty').max(5000, 'Post content cannot exceed 5000 characters').optional().default(''),
    mediaIds: z.array(z.string().uuid()).max(10, 'A post cannot contain more than 10 media files').optional().default([])
}).refine(
    (data) => {
        return data.content.length > 0 || data.mediaIds.length > 0
    },
    {
        message: 'Post must contain text or media'
    }
)

const updatePostSchema = z.object({
    content: z.string().trim().min(1, 'Post content cannot be empty').max(5000, 'Post content cannot exceed 5000 characters')
})




// ============================================================
// ACCESS TOKEN AUTHENTICATION MIDDLEWARE
// ============================================================

//Protects routes that require authentication
const authenticateToken = (req, res, next) => {
    const accessToken = req.cookies.accessToken;

    if(!accessToken){
        return res.status(401).json({error: 'Access Token missing or expired'});
    }

    jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({error: 'Invalid or Expired Access Token'})
        }
        req.user = decoded;
        next()
    })

};

const optionalAuthenticateToken  = (req, res, next) => {
    const accessToken = req.cookies.accessToken

    if(!accessToken) {
        req.user = null
        return next()
    }

    jwt.verify(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET,
        (err, decoded) => {
            if(err) {
                req.user = null
                return next()
            }

            req.user = decoded
            next()
        }
    )
}


// ============================================================
// MEDIA STORAGE
// ============================================================

const uploadDirectory = path.join(__dirname, 'uploads')
const imageDirectory = path.join(uploadDirectory, 'images')
const videoDirectory = path.join(uploadDirectory, 'videos')

fs.mkdirSync(imageDirectory, {
    recursive: true
})

fs.mkdirSync(videoDirectory, {
    recursive: true
})


// ============================================================
// MULTER STORAGE
// ============================================================

const mediaStorage = multer.diskStorage({

    destination: (req, file, cb) => {

        if (file.mimetype.startsWith('image/')) {

            cb(null, imageDirectory)

        } else if (file.mimetype.startsWith('video/')) {

            cb(null, videoDirectory)

        } else {

            cb(new Error('Unsupported media type'))
        }
    },

    filename: (req, file, cb) => {

        const extension = path.extname(file.originalname)

        const filename = `${crypto.randomUUID()}${extension}`

        cb(null, filename)
    }
})


// ============================================================
// MULTER MEDIA UPLOAD
// ============================================================

const mediaUpload = multer({

    storage: mediaStorage,

    limits: {
        fileSize: 100 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        const allowedImageTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif'
        ]

        const allowedVideoTypes = [
            'video/mp4',
            'video/webm',
            'video/quicktime'
        ]

        const allowedTypes = [
            ...allowedImageTypes,
            ...allowedVideoTypes
        ]

        if (!allowedTypes.includes(file.mimetype)) {

            return cb(
                new Error('Unsupported media type')
            )
        }

        cb(null, true)
    }
})


// ============================================================
// MEDIA INFORMATION HELPER
// ============================================================

function getMediaInfo(file) {

    if (file.mimetype.startsWith('image/')) {

        return {
            type: 'image',
            storageKey: `images/${file.filename}`
        }
    }

    if (file.mimetype.startsWith('video/')) {

        return {
            type: 'video',
            storageKey: `videos/${file.filename}`
        }
    }

    throw new Error('Unsupported media type')
}


// ============================================================
// SERVE UPLOADED MEDIA
// ============================================================

app.use(
    '/uploads',
    express.static(uploadDirectory)
)


app.post('/api/auth/register', async (req, res) => {
    const validation = registerSchema.safeParse(req.body)
    if(!validation.success) {
        return res.status(400).json({error: validation.error.flatten().fieldErrors})
    }

    const { firstName, lastName, username, password } = validation.data

    try{
        const existing = await db.select().from(users).where(eq(users.username, username))

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Username is already taken'})
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const [newUser] = await db.insert(users).values({firstName, lastName, username, password: hashedPassword}).returning();

        await issueTokens(newUser.userId, res)

        const {password: _, ...userWithoutPassword } = newUser;
        res.status(201).json({
            user: userWithoutPassword
        })
    }catch (error) {
        console.log(error)
        res.status(500).json({error: 'Registration failed'})
    }
})

app.post('/api/auth/login', async (req, res) => {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({error: validation.error.flatten().fieldErrors})
    }

    const {username, password} = validation.data

    try{
        const result = await db.select().from(users).where(eq(users.username, username))
        if (result.length === 0 ){
            return res.status(401).json({error: 'Invalid username or password'})
        }

        const user = result[0]

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password'})
        }


        await issueTokens(user.userId, res)

        res.status(200).json({
            message: 'Login successful'
        });
    }catch (error){
        console.error(error)
        res.status(500).json({error: 'Login failed'})
    }
})

app.post('/api/auth/refresh', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if(!refreshToken){
        return res.status(401).json({error: 'Refresh token missing'})
    }

    try{
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)

        const savedToken = await db.select().from(refreshTokens).where(and(eq(refreshTokens.token, refreshToken), eq(refreshTokens.revoked, false)))

        if (savedToken.length === 0) {
            return res.status(403).json({error: 'Invalid or revoked refresh token'})
        }

        await db.update(refreshTokens).set({revoked: true}).where(eq(refreshTokens.token, refreshToken))

        await issueTokens(decoded.userId, res);

        res.status(200).json({message: 'Token Refresh Successful'})
    }catch (err) {
        res.status(403).json({error: 'Expired or invalid refresh token'})
    }
})

app.post('/api/auth/logout', async (req, res) =>{
    const refreshToken = req.cookies.refreshToken;

    if(refreshToken) {
        try{
            await db.update(refreshTokens).set({revoked:true}).where(eq(refreshTokens.token, refreshToken))
        }catch (err){
            console.error('Error revoking token in DB:', err);
        }
        
    }

    res.clearCookie('accessToken', ACCESS_COOKIE_OPTIONS);
    res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
    res.status(200).json({message: 'Sucessfully Logged Out'})
})


app.get('/api/profile', authenticateToken, async (req, res) => {

    const currentUserId = req.user.userId

    try{
        const result = await db.select({
            userId: users.userId,
            firstName: users.firstName,
            lastName: users.lastName,
            username: users.username,
            }).from(users).where(eq(users.userId, currentUserId));
        
        if (result.length === 0 ) {
            return res.status(404).json({error: 'User not found'});
        }

        res.status(200).json({user:result[0]})

    }catch (error) {
        res.status(500).json({error: 'Failed to retrieve profile'})
    }
})

app.patch('/api/profile/update', authenticateToken, async (req, res) => {
    const currentUserId = req.user.userId
    const validation = userUpdateSchema.safeParse(req.body)

    if(!validation.success){
        return res.status(400).json({error: 'Invalid input data', details: validation.error.flatten().fieldErrors})
    }

    if(Object.keys(validation.data).length === 0) {
        return res.status(400).json({error: 'No field provided to update'})
    }

    try{
        const updatedUser = await db.update(users).set(validation.data).where(eq(users.userId, currentUserId)).returning({firstName: users.firstName, lastName: users.lastName, username: users.username})

        if(updatedUser.length === 0) {
            return res.status(404).json({error: 'User not found'})
        }

        res.status(200).json({message: 'Successfully Updated ', user: updatedUser[0]})
    }catch (error) {
        console.log('Update Error', error)
        res.status(500).json({error: 'Server Error'})
    }
})

app.delete('/api/profile/delete', authenticateToken, async (req,res) => {
    const currentUserId = req.user.userId
    const {password} = req.body

    if(!password){
        return res.status(400).json({error: 'Password confirmation is required'})
    }

    try{
        const currentUser = await db.select({userId: users.userId, passwordHash: users.password}).from(users).where(eq(users.userId, currentUserId))

        if (currentUser.length === 0){
            return res.status(404).json({error:'User cannot be found '})
        }

        const user = currentUser[0]

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
        if(!isPasswordValid){
            return res.status(401).json({error: 'Incorrect Password'})
        }

        await db.delete(users).where(eq(users.userId, currentUserId))
        

        res.clearCookie('accessToken', ACCESS_COOKIE_OPTIONS)
        res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS)

        res.status(200).json({message: 'Successfully deleted user'})
    }catch (err) {
        console.log(err)
        res.status(500).json({error: 'Cannot delete user'})
    }
})



async function getPostMedia(postId, req) {
    const result = await db.select({
        mediaId: media.mediaId,
        type: media.type,
        storageKey: media.storageKey,
        mimeType: media.mimeType,
        width: media.width,
        height: media.height,
        duration: media.duration,
        sortOrder: postMedia.sortOrder
    })
    .from(postMedia)
    .innerJoin(
        media,
        eq(postMedia.mediaId, media.mediaId)
    )
    .where(
        eq(postMedia.postId, postId)
    )
    .orderBy(
        postMedia.sortOrder
    )

    return result.map(item => ({
        ...item,

        url: `${req.protocol}://${req.get('host')}/uploads/${item.storageKey}`
    }))
}




app.post('/api/posts', authenticateToken, async (req, res) => {
    const validation = createPostSchema.safeParse(req.body)

    if(!validation.success) {
        return res.status(400).json({error: validation.error.flatten().fieldErrors})
    }

    const userId = req.user.userId

    const {content, mediaIds} = validation.data

    try{

        if(mediaIds.length > 0) {
            const userMedia = await db.select({mediaId: media.mediaId}).from(media).where(
                and(
                    inArray(media.mediaId, mediaIds),
                    eq(media.uploadedBy, userId)
                )
            )

            const ownedMediaIds = new Set(
                userMedia.map(item => item.mediaId)
            )

            const unauthorizedMedia = mediaIds.filter(
                mediaId => !ownedMediaIds.has(mediaId)
            )

            if(unauthorizedMedia.length > 0) {
                return res.status(403).json({
                    error: 'You cannot attach media that you do not own'
                })
            }
        }

        const [newPost] = await db.insert(posts).values({
            userId: userId,
            content: content || null
        }).returning()

        if(mediaIds.length > 0) {
            await db.insert(postMedia).values(mediaIds.map(
                (mediaId, index) => ({
                    postId: newPost.postId,

                    mediaId: mediaId,
                    
                    sortOrder: index
                })
            ))
        }

        const postMediaItems = await getPostMedia(
            newPost.postId,
            req
        )

        return res.status(201).json({message: 'Post created', post: {...newPost, media: postMediaItems}})
    }catch (error) {
        console.error('Create post error', error)

        return res.status(500).json({
            error: 'Failed to create post'
        })
    }
})

app.get('/api/posts/:postId', async (req, res) => {
    const  {postId} = req.params

    try{
        const result = await db.select({
            postId: posts.postId,
            content: posts.content,
            createdAt: posts.createdAt,
            updatedAt: posts.updatedAt,
            userId: users.userId,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName
        }).from(posts).innerJoin(
            users, eq(
                posts.userId,
                users.userId
            )
        ).where(
            and(
                eq(
                    posts.postId, postId
                ),
                isNull(
                    posts.deletedAt
                )
            )
        )

        if(result.length === 0) {
            return res.status(404).json({error: 'Post not found'})
        }

        const post = result[0]

        const postMediaItems = await getPostMedia(
            post.postId,
            req
        )

        return res.status(200).json({post: {...post, media: postMediaItems}})

    }catch (error) {
        console.error('Get post error', error)
        return res.status(500).json({error: 'Failed to retrieve post'})
    }
})
app.get('/api/posts', optionalAuthenticateToken, async (req, res) => {
    const currentUserId = req.user?.userId ?? null

    try {
        const result = await db
            .select({
                postId: posts.postId,
                content: posts.content,
                createdAt: posts.createdAt,
                updatedAt: posts.updatedAt,

                userId: users.userId,
                username: users.username,
                firstName: users.firstName,
                lastName: users.lastName,

                likeCount: sql`
                    (
                        SELECT COUNT(*)::int
                        FROM ${likes}
                        WHERE ${likes.postId} = ${posts.postId}
                    )
                `.as('likeCount'),

                likedByCurrentUser: currentUserId
                    ? sql`
                        EXISTS (
                            SELECT 1
                            FROM ${likes}
                            WHERE ${likes.postId} = ${posts.postId}
                            AND ${likes.userId} = ${currentUserId}
                        )
                    `.as('likedByCurrentUser')
                    : sql`false`.as('likedByCurrentUser')
            })
            .from(posts)
            .leftJoin(
                users,
                eq(posts.userId, users.userId)
            )
            .where(
                isNull(posts.deletedAt)
            )
            .orderBy(
                desc(posts.createdAt)
            )

        const postsWithMedia = await Promise.all(
            result.map(async (post) => {
                const postMediaItems = await getPostMedia(
                    post.postId,
                    req
                )

                return {
                    ...post,
                    media: postMediaItems
                }
            })
        )

        return res.status(200).json({
            posts: postsWithMedia
        })

    } catch (error) {
        console.error('Get posts error:', error)

        return res.status(500).json({
            error: 'Failed to retrieve posts'
        })
    }
})


app.patch('/api/posts/:postId', authenticateToken, async (req, res) => {

    const { postId } = req.params

    const userId = req.user.userId

    const validation = updatePostSchema.safeParse(req.body)

    if (!validation.success) {
        return res.status(400).json({
            error: validation.error.flatten().fieldErrors
        })
    }

    try {

        const [updatedPost] = await db
            .update(posts)
            .set({
                content: validation.data.content,
                updatedAt: new Date()
            })
            .where(
                and(
                    eq(posts.postId, postId),
                    eq(posts.userId, userId),
                    isNull(posts.deletedAt)
                )
            )
            .returning()

        if (!updatedPost) {
            return res.status(404).json({
                error: 'Post not found or you do not own this post'
            })
        }

        // Get attached media
        const postMediaItems = await getPostMedia(
            updatedPost.postId,
            req
        )

        return res.status(200).json({
            message: 'Post updated successfully',

            post: {
                ...updatedPost,
                media: postMediaItems
            }
        })

    } catch (error) {

        console.error(
            'Update post error:',
            error
        )

        return res.status(500).json({
            error: 'Failed to update post'
        })
    }
})


app.delete('/api/posts/:postId', authenticateToken, async (req, res) => {

    const {postId} = req.params

    const userId = req.user.userId

    try{

        const postResult = await db.select({postId: posts.postId}).from(posts).where(
            and(
                eq(posts.postId, postId),
                eq(posts.userId, userId),
                isNull(posts.deletedAt)
            )
        )

        if (postResult.length === 0) {
            return res.status(404).json({error: 'Post not found'})
        }

        const attachedMedia = await db.select({mediaId: media.mediaId, storageKey: media.storageKey}).from(postMedia)
                                .innerJoin(
                                    media,
                                    eq(postMedia.mediaId, media.mediaId)
                                )
                                .where(
                                    eq(postMedia.postId, postId)
                                )
        for (const item of attachedMedia) {
            const filePath = path.join(
                uploadDirectory,
                item.storageKey
            )

            if(fs.existsSync(filePath)){
                fs.unlinkSync(filePath)
            }
        }

        await db.delete(posts).where(
            and(
                eq(posts.postId, postId),
                eq(posts.userId, userId)
            )
        )
        

        return res.status(200).json({message:'Successfully deleted post'})

    }catch (error) {
        console.error('Delete post error', error)
        return res.status(500).json({error: 'Failed to delete post'})
    }
})


app.post(
    '/api/media',
    authenticateToken,
    mediaUpload.single('file'),
    async (req, res) => {

        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded'
            })
        }

        try {

            const {
                type: mediaType,
                storageKey
            } = getMediaInfo(req.file)

            const [newMedia] = await db
                .insert(media)
                .values({
                    uploadedBy: req.user.userId,
                    type: mediaType,
                    storageKey: storageKey,
                    mimeType: req.file.mimetype
                })
                .returning()

            return res.status(201).json({
                message: 'Media uploaded successfully',
                media: newMedia
            })

        } catch (error) {

            console.error(
                'Media upload error',
                error
            )

            try {

                if (
                    req.file?.path &&
                    fs.existsSync(req.file.path)
                ) {
                    fs.unlinkSync(req.file.path)
                }

            } catch (deleteError) {

                console.error(
                    'Failed to remove uploaded file',
                    deleteError
                )
            }

            return res.status(500).json({
                error: 'Failed to save media'
            })
        }
    }
)

app.put(
    '/api/posts/:postId/media',
    authenticateToken,
    mediaUpload.single('file'),
    async (req, res) => {

        const { postId } = req.params
        const userId = req.user.userId

        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded'
            })
        }

        try {
            // ============================================
            // 1. Make sure the post belongs to the user
            // ============================================

            const existingPost = await db
                .select({
                    postId: posts.postId
                })
                .from(posts)
                .where(
                    and(
                        eq(posts.postId, postId),
                        eq(posts.userId, userId),
                        isNull(posts.deletedAt)
                    )
                )

            if (existingPost.length === 0) {

                // Remove newly uploaded file because
                // the post doesn't exist/belong to user
                try {
                    fs.unlinkSync(req.file.path)
                } catch (deleteError) {
                    console.error(
                        'Failed to remove uploaded file:',
                        deleteError
                    )
                }

                return res.status(404).json({
                    error: 'Post not found or you do not own this post'
                })
            }


            // ============================================
            // 2. Find existing media attached to post
            // ============================================

            const existingMedia = await db
                .select({
                    mediaId: postMedia.mediaId,
                    storageKey: media.storageKey
                })
                .from(postMedia)
                .innerJoin(
                    media,
                    eq(postMedia.mediaId, media.mediaId)
                )
                .where(
                    eq(postMedia.postId, postId)
                )


            // ============================================
            // 3. Create new media record
            // ============================================

            const {
                type: mediaType,
                storageKey
            } = getMediaInfo(req.file)

            const [newMedia] = await db
                .insert(media)
                .values({
                    uploadedBy: userId,
                    type: mediaType,
                    storageKey: storageKey,
                    mimeType: req.file.mimetype
                })
                .returning()


            // ============================================
            // 4. Remove old post_media relationships
            // ============================================

            await db
                .delete(postMedia)
                .where(
                    eq(postMedia.postId, postId)
                )


            // ============================================
            // 5. Attach new media to post
            // ============================================

            await db
                .insert(postMedia)
                .values({
                    postId: postId,
                    mediaId: newMedia.mediaId,
                    sortOrder: 0
                })


            // ============================================
            // 6. Delete old media records/files
            // ============================================

            for (const oldMedia of existingMedia) {

                const oldFilePath = path.join(
                    uploadDirectory,
                    oldMedia.storageKey
                )

                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath)
                }

                await db
                    .delete(media)
                    .where(
                        eq(media.mediaId, oldMedia.mediaId)
                    )
            }


            // ============================================
            // 7. Return new media
            // ============================================

            return res.status(200).json({
                message: 'Post media replaced successfully',
                media: newMedia
            })

        } catch (error) {

            console.error(
                'Replace post media error:',
                error
            )

            // Delete newly uploaded file if something failed
            try {
                fs.unlinkSync(req.file.path)
            } catch (deleteError) {
                console.error(
                    'Failed to remove uploaded file:',
                    deleteError
                )
            }

            return res.status(500).json({
                error: 'Failed to replace post media'
            })
        }
    }
)



app.get('/api/media/:mediaId', async (req, res) => {
    const {mediaId} = req.params

    try{
        const result = await db.select().from(media).where(eq(media.mediaId, mediaId))

        if(result.length === 0) {
            return res.status(404).json({error: 'Media not found'})
        }

        return res.status(200).json({media: result[0]})
    }catch (error) {
        console.error('Get media error: ', error)
        return res.status(500).json({error: 'Failed to retrieve media'})
    }
})

app.delete('/api/media/:mediaId', authenticateToken, async (req, res) => {
    const {mediaId} = req.params
    const userId = req.user.userId

    try{
        const result = await db.select().from(media).where(and(
            eq(
                media.mediaId, mediaId
            ),
            eq(
                media.uploadedBy,
                userId
            )
        ))

        if(result.length === 0) {
            return res.status(404).json({error: 'Media not found or user did upload this media'})
        }
        const mediaFile = result[0]
        const filePath = path.join(uploadDirectory, mediaFile.storageKey)

        if(fs.existsSync(filePath)){
            fs.unlinkSync(filePath)
        }

        await db.delete(media).where(eq(media.mediaId, mediaId))

        return res.status(200).json({message: 'Media deleted successfully'})
    }catch (error) {
        console.error('Delete media error: ', error)

        return res.status(500).json({error: 'Failed to delete media'})
    }
})


app.post('/api/posts/:postId/like', authenticateToken, async (req, res) => {
    const {postId} = req.params
    const userId = req.user.userId

    try{
       const post = await db.select({postId: posts.postId}).from(posts).where(eq(posts.postId, postId)).limit(1)

       if(post.length === 0){
        return res.status(404).json({error: 'Post not found'})
       }

       const existingLike = await db.select({likeId: likes.likeId}).from(likes).where(
        and(
            eq(likes.postId, postId),
            eq(likes.userId, userId)
        )
       ).limit(1)

       if (existingLike.length > 0) {
        return res.status(409).json({message:'Post already liked'})
       }

       const [like] = await db.insert(likes).values({
                        userId: userId,
                        postId: postId
                    }).returning()
        
        return res.status(200).json({message:'Post liked', like})

    }catch (error) {
        console.error('Error liking post', error)

        return res.status(500).json('Failed to like post')
    }
})

app.get('/api/posts/:postId/like', authenticateToken, async (req, res) => {
    const {postId} = req.params
    const userId = req.user.userId

    try{
        const like = await db.select({likeId: likes.likeId}).from(likes).where(
            and(
                eq(likes.postId, postId),
                eq(likes.userId, userId)
            )
        ).limit(1)

        return res.status(200).json({liked: like.length > 0})
    }catch (error){
        console.error('Error checking like', like)

        return res.status(500).json({error: 'Failed to check like'})
    }
})

app.delete('/api/posts/:postId/like', authenticateToken, async (req, res) => {
    const {postId} = req.params
    const userId = req.user.userId

    try{
        const deletedLike = await db.delete(likes).where(
            and(
                eq(likes.postId, postId),
                eq(likes.userId, userId)
            )
        ).returning()

        if(deletedLike.length === 0) {
            return res.status(404).json({error: 'Like not found'})
        }

        return res.status(200).json({message: 'Post unliked'})

    }catch (error) {
        console.error('Error unliking post: ', error)

        return res.status(500).json({error: 'Failed to unlike post'})
    }
})



module.exports = app